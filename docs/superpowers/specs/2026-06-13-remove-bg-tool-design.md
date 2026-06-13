# `remove-bg` — local background-removal CLI

**Date:** 2026-06-13
**Status:** design, pending implementation
**Owner:** juraj

## 1. Goal & scope

A small command-line tool, `remove-bg`, that removes the background from a single
image and writes the result as a transparent PNG beside the original. The
motivating use case is the orthoam.sk marketing site: making product and subject
imagery (doctor portrait, certificate scans, product shots) blend into the page
without a clashing rectangular background.

Out of scope (v1):

- Batch processing.
- In-place overwrite.
- Soft-alpha feathering.
- GPU acceleration.
- Background replacement (only removal is supported).
- Any backend, server, or remote API at runtime.

The default engine is a local U2Net ONNX model. Multiple models are supported
via `--model`. The tool runs fully offline after the first-run model download.

## 2. Layout

```
tools/
  remove-bg/
    main.go                          # CLI entry: parse flags, call RemoveBg
    remover.go                       # core pipeline: preprocess -> infer -> composite
    preprocess.go                    # RGB convert, letterbox to 320x320, normalize, NCHW
    postprocess.go                   # sigmoid mask, resize back, alpha-composite, encode PNG
    model.go                         # model registry, download, cache, lookup
    remover_test.go                  # golden + unit tests
    testdata/                        # small committed fixtures (gitignored except for tiny committed ones)
    models/                          # downloaded .onnx files (gitignored)
    lib/                             # libonnxruntime shared lib (gitignored)
    bin/                             # build output (gitignored)
    cmd/
      download-onnxruntime/
        main.go                      # host-aware fetcher for the ONNXRuntime shared lib
    go.mod
    go.sum
    README.md                        # usage, model list, troubleshooting, offline setup
.mise.toml                           # pins Go version, exposes build + download tasks
```

Build output: `tools/remove-bg/bin/remove-bg` (gitignored).

## 3. Dependencies

**Runtime native library:** `libonnxruntime.<dylib|so|dll>` from the official
ONNXRuntime release. The tool resolves it in this order:

1. `--onnx-lib <path>` CLI flag.
2. `ONNXRUNTIME_LIB` environment variable.
3. `tools/remove-bg/lib/` (managed by the `download-onnxruntime` task).
4. System loader paths (e.g. Homebrew `/opt/homebrew/lib` on macOS).

If none of the above yields a loadable library, the tool exits with code 3 and
a message pointing at the README's setup section.

**Go modules:**

- `github.com/yalue/onnxruntime_go` — pure-Go bindings over the ONNXRuntime
  shared library. Chosen over a gocv/OpenCV approach to keep the native
  dependency surface to a single shared lib and avoid OpenCV.
- `golang.org/x/image/draw` — high-quality resize.
- `golang.org/x/image/webp` — WebP decode for input.
- Go stdlib for JPEG/PNG I/O and `image.Image` plumbing.

No build step, no bundler, no framework. Standard `go build`.

## 4. Model management

Default model registry, defined in `model.go`:

| Key           | File                       | Source                                                                          | Approx. size |
|---------------|----------------------------|---------------------------------------------------------------------------------|--------------|
| `u2net`       | `u2net.onnx`               | rembg project's published `u2net.onnx`                                           | ~44 MB       |
| `u2netp`      | `u2netp.onnx`              | rembg project's published `u2netp.onnx` (smaller/faster variant)                | ~12 MB       |
| `u2net_human` | `u2net_human_seg-8.onnx`   | rembg project's published people-focused model                                   | ~176 MB      |

Behaviour:

- Default model: `u2net`. Override with `--model <key>`.
- `--model <path>` (a file ending in `.onnx`) uses that file directly — no
  download, no registry lookup.
- Downloaded models are cached at `tools/remove-bg/models/<file>`. That
  directory is gitignored.
- First run for a registered model: download with a progress line on stderr,
  then proceed.
- **URL policy:** only URLs pointing at the upstream rembg project's published
  model files are hard-coded. If a download URL 404s or the host is
  unreachable, the tool exits with code 3 and a message pointing at the
  README's offline-setup section. It does **not** silently fall back to
  another source.

## 5. Pipeline (per image)

1. **Decode** the input. Supported formats: JPEG, PNG, WebP. Anything else
   returns an error (exit 4).
2. **Preprocess:**
   - Convert to RGB (discard any existing alpha).
   - Letterbox-resize to 320x320 preserving aspect ratio: scale so the
     longer side becomes 320, then pad the shorter side with `0x00` on both
     ends to reach 320x320.
   - Normalize each pixel to `[0,1]` and apply ImageNet mean/std
     (`mean = [0.485, 0.456, 0.406]`, `std = [0.229, 0.224, 0.215]`) — the
     statistics U2Net was trained against.
   - Arrange as NCHW `float32` tensor: shape `[1, 3, 320, 320]`.
3. **Infer:** ONNXRuntime session with the CPU execution provider, single
   input tensor, single output tensor.
4. **Postprocess:**
   - Apply sigmoid to the raw output to get a `[0,1]` mask.
   - Crop the letterbox padding from the mask, then resize the mask back to
     the original `(W, H)` using bilinear interpolation.
   - Threshold at `0.5` to produce a hard alpha mask. (Soft alpha is a
     documented non-goal for v1.)
5. **Composite:** output image is the original RGB with `alpha = mask`.
   Straight alpha (no premultiplication needed for PNG encode).
6. **Encode** as PNG and write to the output path.

## 6. CLI

```
remove-bg <input-image>

Flags:
  -o, --out PATH        output path (default: <input-basename>-no-bg.png next to input)
  -m, --model KEY|PATH  model key (u2net|u2netp|u2net_human) or path to a .onnx file
      --onnx-lib PATH   path to libonnxruntime shared lib
  -q, --quiet           suppress progress messages on stderr
      --version         print version and exit
```

**Exit codes:**

- `0` — success.
- `2` — usage / flag error.
- `3` — model or ONNXRuntime library error (download failure, file not
  found, library unloadable).
- `4` — inference error (unsupported input format, session failure).
- `5` — IO error (cannot read input, cannot write output).

All stderr messages are prefixed `remove-bg:` for greppability.

**Output default:** `<input-basename>-no-bg.png` in the same directory as
the input. The extension is always `.png` regardless of input format,
because the result has an alpha channel.

## 7. mise configuration

`.mise.toml` at the repository root:

```toml
[tools]
go = "1.22"

[tasks.build-remove-bg]
description = "Build the background-removal CLI into tools/remove-bg/bin/"
run = "go build -o tools/remove-bg/bin/remove-bg ./tools/remove-bg"

[tasks.download-onnxruntime]
description = "Fetch the ONNXRuntime shared lib for this host into tools/remove-bg/lib/"
run = "go run ./tools/remove-bg/cmd/download-onnxruntime"
```

The `download-onnxruntime` side binary detects `GOOS`/`GOARCH`, downloads the
matching GitHub release tarball for ONNXRuntime, and extracts just the shared
library plus its `LICENSE.txt` into `tools/remove-bg/lib/`. Keeping this in a
separate binary lets the main `remove-bg` CLI stay focused on its single job.

## 8. Testing

`remover_test.go` covers:

- **Golden test:** a small committed fixture (e.g. `testdata/duck.jpg`, a
  rights-clear photo ~5 KB) is run through the full pipeline and the
  resulting mask is compared to `testdata/duck.mask.golden.png` with a
  per-pixel tolerance. Catches regressions in preprocessing and
  postprocessing wiring.
- **Preprocess unit test:** a synthetic 2x2 RGB image is fed through
  `preprocess` and the resulting tensor values are asserted exactly (covers
  mean/normalize math and NCHW layout).
- **Postprocess unit test:** a hand-crafted mask array is fed through
  `postprocess` and the resulting alpha-channel bytes are asserted exactly.
- **Letterbox test:** a non-square input is letterboxed and the padding
  geometry is asserted.

Inference-dependent tests auto-skip (`t.Skip`) when `ONNXRUNTIME_LIB` is not
resolvable, so `go test ./...` passes on a fresh checkout without the native
library. The README documents how to run the full suite locally.

## 9. Non-goals (v1)

- Batch processing. The core is a function; shell loops cover batches.
- `--in-place` overwrite.
- Feathering / soft alpha.
- GPU execution provider.
- Docker image.
- Background replacement.

## 10. Open questions

None at design time. Implementation may surface specifics around the exact
ONNXRuntime release version to pin in `download-onnxruntime`; that decision
is deferred to implementation.
