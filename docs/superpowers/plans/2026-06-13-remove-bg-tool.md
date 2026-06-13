# `remove-bg` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Go CLI, `remove-bg`, that removes an image's background using a local U2Net ONNX model and writes a transparent PNG beside the original.

**Architecture:** Single Go module under `tools/remove-bg/`. The pipeline is four pure functions (`preprocess`, `postprocess`, `composeAlpha`, plus the ONNX inference shim) wrapped by a `RemoveBg` orchestrator. CLI is a thin `main.go`. A separate `cmd/download-onnxruntime` binary fetches the host's native ONNXRuntime shared library. `mise` pins Go and exposes build/download tasks.

**Tech Stack:** Go 1.22, `github.com/yalue/onnxruntime_go` (1.26.0 headers), ONNXRuntime 1.26.0 native lib, `golang.org/x/image/draw` + `golang.org/x/image/webp`, Go stdlib `image`.

**Spec:** `docs/superpowers/specs/2026-06-13-remove-bg-tool-design.md`

**Key external facts (verified):**
- `onnxruntime_go` API: `ort.SetSharedLibraryPath(path)` → `ort.InitializeEnvironment()` → `ort.NewAdvancedSession(onnxPath, inputNames, outputNames, inputs, outputs, opts)` → `session.Run()` → read `tensor.GetData()`. Cleanup: `session.Destroy()`, `tensor.Destroy()`, `ort.DestroyEnvironment()`.
- `ort.GetInputOutputInfo(path)` returns `([]InputOutputInfo, []InputOutputInfo, error)` — used at session-build time to read actual input/output names from the model (robust to model variants).
- Tensor types: `ort.NewTensor[float32](shape, data)`, `ort.NewEmptyTensor[float32](shape)`, `ort.NewShape(int64...)`.
- U2Net I/O: input name `"input"`, shape `[1,3,320,320]` float32; output name `"output"`, shape `[1,1,320,320]` float32. The tool reads these dynamically via `GetInputOutputInfo` rather than hardcoding.
- ONNXRuntime release to pin: **v1.26.0** (matches the `onnxruntime_go` headers).
- The `onnxruntime_go` library checks `ONNXRUNTIME_SHARED_LIBRARY_PATH` env var when its own embedded test libs don't match the host; the tool uses `SetSharedLibraryPath` explicitly instead.

---

## File map

| File | Responsibility |
|------|----------------|
| `tools/remove-bg/go.mod` | Module declaration (`tools/remove-bg`), Go 1.22, deps. |
| `tools/remove-bg/go.sum` | Committed by `go mod tidy`. |
| `tools/remove-bg/.gitignore` | Ignore `bin/`, `models/`, `lib/`. |
| `tools/remove-bg/preprocess.go` | `preprocess(img image.Image) (tensor []float32, info preprocessInfo, err error)`. Pure. |
| `tools/remove-bg/preprocess_test.go` | Unit tests for preprocess math + letterbox. |
| `tools/remove-bg/postprocess.go` | `postprocess(maskData []float32, srcW, srcH int, pad padInfo) (*image.Gray, error)`. Pure. |
| `tools/remove-bg/postprocess_test.go` | Unit tests for sigmoid, resize-back, threshold. |
| `tools/remove-bg/compose.go` | `composeAlpha(src image.Image, mask *image.Gray) *image.NRGBA`. Pure. |
| `tools/remove-bg/compose_test.go` | Unit test for alpha compositing. |
| `tools/remove-bg/model.go` | Model registry, download w/ progress, cache path resolution. |
| `tools/remove-bg/model_test.go` | Registry lookup + URL tests. |
| `tools/remove-bg/remover.go` | `RemoveBg(opts Options) error` — orchestrates preprocess → infer → postprocess → compose → encode. |
| `tools/remove-bg/remover_test.go` | Golden test (skips if `ONNXRUNTIME_LIB` unset). |
| `tools/remove-bg/testdata/duck.jpg` | Tiny (~5 KB) rights-clear fixture for the golden test. |
| `tools/remove-bg/testdata/duck.mask.golden.png` | Expected mask output, committed. |
| `tools/remove-bg/main.go` | CLI: flag parsing, exit codes, log formatting. |
| `tools/remove-bg/cmd/download-onnxruntime/main.go` | Host-aware fetcher for the ONNXRuntime shared lib. |
| `tools/remove-bg/README.md` | Usage, setup, model list, troubleshooting. |
| `.mise.toml` | Pin Go 1.22, expose `build-remove-bg` + `download-onnxruntime` tasks. |
| `.gitignore` (root, edit) | Add `tools/remove-bg/bin/`, `tools/remove-bg/models/`, `tools/remove-bg/lib/` if not already covered. |

---

## Conventions for every task

- **TDD:** write the failing test first, run it, implement, run it again, commit.
- **One concern per commit.** Commit messages use Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `refactor:`).
- **All paths are relative to repo root** `/Users/juraj/Documents/MISC/orthoam.sk`.
- **Run Go commands from `tools/remove-bg/`** unless noted. The plan writes them as `cd tools/remove-bg && go test ./...` etc., but you may run them with absolute paths if your shell preserves cwd.
- **No `--no-verify`, no `--amend`** unless a hook-modified commit needs amending AND the user approves.

---

### Task 1: Scaffold the Go module

**Files:**
- Create: `tools/remove-bg/go.mod`
- Create: `tools/remove-bg/.gitignore`
- Edit: `.gitignore` (root, if it exists; otherwise create)

- [ ] **Step 1: Create the module**

Run:
```bash
mkdir -p tools/remove-bg
cd tools/remove-bg
go mod init tools/remove-bg
```

Expected: `go: creating new go.mod: module tools/remove-bg` and a `go.mod` containing `module tools/remove-bg` and `go 1.22` (or newer — if `go` writes a newer minor like `go 1.23`, leave it; the plan says "1.22 minimum").

- [ ] **Step 2: Create the package `.gitignore`**

Write `tools/remove-bg/.gitignore`:

```
/bin/
/models/
/lib/
```

- [ ] **Step 3: Ensure the root `.gitignore` covers build artifacts**

Read the existing root `.gitignore` (if any). If it does not already ignore `tools/remove-bg/bin/`, `tools/remove-bg/models/`, `tools/remove-bg/lib/`, append:

```
tools/remove-bg/bin/
tools/remove-bg/models/
tools/remove-bg/lib/
```

If no root `.gitignore` exists, create one with just those three lines.

- [ ] **Step 4: Verify the module compiles**

Run:
```bash
cd tools/remove-bg && go build ./...
```

Expected: no output, exit 0 (there is no `.go` file yet, so `go build ./...` may warn "no Go files"; that's acceptable at this step — verify it does not error on `go.mod`).

If it errors "no Go files in ...", that is fine. Move on.

- [ ] **Step 5: Commit**

```bash
git add tools/remove-bg/go.mod tools/remove-bg/.gitignore .gitignore
git commit -m "chore(remove-bg): scaffold go module"
```

---

### Task 2: `preprocess` — letterbox + normalize (TDD)

**Files:**
- Create: `tools/remove-bg/preprocess.go`
- Create: `tools/remove-bg/preprocess_test.go`

**What it does:** Takes a decoded `image.Image`, converts to RGB, letterbox-resizes to 320x320 (longer side = 320, shorter side padded symmetrically with black), normalizes per-channel with ImageNet mean/std, returns the NCHW float32 tensor plus metadata describing the letterbox padding (needed by `postprocess` to crop the mask back).

- [ ] **Step 1: Write the failing test**

Create `tools/remove-bg/preprocess_test.go`:

```go
package main

import (
	"image"
	"math"
	"testing"
)

// Synthetic 2x2 image with distinct colors lets us assert exact tensor values
// after preprocessing. We verify (a) normalization math on a known pixel and
// (b) NCHW layout (channel stride separates planes).
func TestPreprocess_NormalizesAndArrangesNCHW(t *testing.T) {
	// 2x2: top-left red, top-right green, bottom-left blue, bottom-right gray.
	src := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	src.Set(0, 0, image.NewUniform(image.NRGBA{R: 255, G: 0, B: 0, A: 255}))
	src.Set(1, 0, image.NewUniform(image.NRGBA{R: 0, G: 255, B: 0, A: 255}))
	src.Set(0, 1, image.NewUniform(image.NRGBA{R: 0, G: 0, B: 255, A: 255}))
	src.Set(1, 1, image.NewUniform(image.NRGBA{R: 128, G: 128, B: 128, A: 255}))

	tensor, info, err := preprocess(src)
	if err != nil {
		t.Fatalf("preprocess: %v", err)
	}

	if got, want := len(tensor), 1*3*ModelDim*ModelDim; got != want {
		t.Fatalf("tensor len = %d, want %d", got, want)
	}
	if got, want := info.srcW, 2; got != want {
		t.Errorf("srcW = %d, want %d", got, want)
	}
	if got, want := info.srcH, 2; got != want {
		t.Errorf("srcH = %d, want %d", got, want)
	}

	// Red pixel normalized: (255/255 - 0.485) / 0.229 = 2.2489...
	wantR := (1.0 - 0.485) / 0.229
	idxR := planeIndex(0, 0, 0, 0) // channel 0 (R), row 0, col 0
	if !approxEqual(tensor[idxR], float32(wantR), 1e-3) {
		t.Errorf("R normalized = %f, want ~%f", tensor[idxR], wantR)
	}

	// Green pixel: channel 1 (G), row 0, col 1.
	wantG := (1.0 - 0.456) / 0.224
	idxG := planeIndex(1, 0, 1, 0)
	if !approxEqual(tensor[idxG], float32(wantG), 1e-3) {
		t.Errorf("G normalized = %f, want ~%f", tensor[idxG], wantG)
	}

	// Blue pixel: channel 2 (B), row 1, col 0.
	wantB := (1.0 - 0.406) / 0.215
	idxB := planeIndex(2, 1, 0, 0)
	if !approxEqual(tensor[idxB], float32(wantB), 1e-3) {
		t.Errorf("B normalized = %f, want ~%f", tensor[idxB], wantB)
	}
}

// Non-square input must letterbox with the longer side becoming 320 and the
// shorter side padded symmetrically. A 2x4 image (w=2,h=4) scales by 80x to
// 160x320, so padding is 80 px on each side horizontally.
func TestPreprocess_LetterboxNonSquare(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 2, 4))
	// Mark the center column black, edges white — but here just check geometry.
	for y := 0; y < 4; y++ {
		for x := 0; x < 2; x++ {
			src.Set(x, y, image.NewUniform(image.NRGBA{R: 255, G: 255, B: 255, A: 255}))
		}
	}

	_, info, err := preprocess(src)
	if err != nil {
		t.Fatalf("preprocess: %v", err)
	}

	if got, want := info.padLeft, 80; got != want {
		t.Errorf("padLeft = %d, want %d", got, want)
	}
	if got, want := info.padTop, 0; got != want {
		t.Errorf("padTop = %d, want %d", got, want)
	}
	if got, want := info.scaledW, 160; got != want {
		t.Errorf("scaledW = %d, want %d", got, want)
	}
	if got, want := info.scaledH, 320; got != want {
		t.Errorf("scaledH = %d, want %d", got, want)
	}
}

func approxEqual(a, b float32, eps float64) bool {
	return math.Abs(float64(a)-float64(b)) < eps
}

// planeIndex returns the flat index into the NCHW tensor for (channel, row, col).
// Computed from the layout: [C][H][W] with strides H*W and W.
func planeIndex(c, row, col, _ int) int {
	return c*ModelDim*ModelDim + row*ModelDim + col
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestPreprocess
```

Expected: build failure — `preprocess` undefined, `ModelDim` undefined, `preprocessInfo` fields undefined.

- [ ] **Step 3: Implement `preprocess.go`**

Create `tools/remove-bg/preprocess.go`:

```go
package main

import (
	"fmt"
	"image"
	"image/color"

	"golang.org/x/image/draw"
)

// ModelDim is the side length U2Net expects (320x320).
const ModelDim = 320

// ImageNet normalization statistics used by U2Net preprocessing.
var (
	imageNetMean = [3]float32{0.485, 0.456, 0.406}
	imageNetStd  = [3]float32{0.229, 0.224, 0.215}
)

// preprocessInfo carries the geometry needed by postprocess to undo the
// letterbox and resize the mask back to the original size.
type preprocessInfo struct {
	srcW, srcH int // original dimensions
	scaledW, scaledH int // dimensions after aspect-preserving scale
	padLeft, padTop int // letterbox padding in model-space pixels
}

// preprocess converts img to RGB, letterbox-resizes to ModelDim x ModelDim,
// normalizes per ImageNet stats, and returns the NCHW float32 tensor.
func preprocess(img image.Image) (tensor []float32, info preprocessInfo, err error) {
	bounds := img.Bounds()
	info.srcW = bounds.Dx()
	info.srcH = bounds.Dy()
	if info.srcW <= 0 || info.srcH <= 0 {
		return nil, preprocessInfo{}, fmt.Errorf("invalid image size %dx%d", info.srcW, info.srcH)
	}

	// Scale so the longer side becomes ModelDim.
	scale := float64(ModelDim) / float64(maxInt(info.srcW, info.srcH))
	info.scaledW = maxInt(1, int(float64(info.srcW)*scale))
	info.scaledH = maxInt(1, int(float64(info.srcH)*scale))
	info.padLeft = (ModelDim - info.scaledW) / 2
	info.padTop = (ModelDim - info.scaledH) / 2

	// Draw the resized image onto a black ModelDim x ModelDim canvas.
	canvas := image.NewNRGBA(image.Rect(0, 0, ModelDim, ModelDim))
	// image.NewNRGBA already zeroes pixels, so padding is black (0,0,0).
	resizedRect := image.Rect(info.padLeft, info.padTop, info.padLeft+info.scaledW, info.padTop+info.scaledH)
	draw.BiLinear.Scale(canvas, resizedRect, img, bounds, draw.Src, nil)

	// Flatten to NCHW float32 with normalization.
	tensor = make([]float32, 3*ModelDim*ModelDim)
	plane := ModelDim * ModelDim
	for y := 0; y < ModelDim; y++ {
		for x := 0; x < ModelDim; x++ {
			c := canvas.NRGBAAt(x, y)
			r := float32(c.R) / 255.0
			g := float32(c.G) / 255.0
			b := float32(c.B) / 255.0
			tensor[0*plane+y*ModelDim+x] = (r - imageNetMean[0]) / imageNetStd[0]
			tensor[1*plane+y*ModelDim+x] = (g - imageNetMean[1]) / imageNetStd[1]
			tensor[2*plane+y*ModelDim+x] = (b - imageNetMean[2]) / imageNetStd[2]
		}
	}
	return tensor, info, nil
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Ensure we use color.NRGBA model implicitly via canvas; the import is used.
var _ = color.NRGBAModel
```

- [ ] **Step 4: Add the `golang.org/x/image` dependency**

Run:
```bash
cd tools/remove-bg && go mod tidy
```

Expected: `go.sum` created/updated with `golang.org/x/image` entries.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestPreprocess -v
```

Expected: both `TestPreprocess_NormalizesAndArrangesNCHW` and `TestPreprocess_LetterboxNonSquare` PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/remove-bg/preprocess.go tools/remove-bg/preprocess_test.go tools/remove-bg/go.mod tools/remove-bg/go.sum
git commit -m "feat(remove-bg): add letterbox + normalize preprocessing"
```

---

### Task 3: `postprocess` — mask → alpha (TDD)

**Files:**
- Create: `tools/remove-bg/postprocess.go`
- Create: `tools/remove-bg/postprocess_test.go`

**What it does:** Takes the raw `[1,1,320,320]` model output, applies sigmoid, crops the letterbox padding, bilinear-resizes back to the original `(srcW, srcH)`, thresholds at 0.5, returns an `*image.Gray` mask of the original size.

- [ ] **Step 1: Write the failing test**

Create `tools/remove-bg/postprocess_test.go`:

```go
package main

import (
	"math"
	"testing"
)

// A flat raw output of all-zeros produces sigmoid 0.5 everywhere, which
// thresholds to 128 (mid-gray). After cropping and resizing back to a 1x1
// source, the single output pixel should be 128 (>= 0.5 -> keep alpha).
// Actually sigmoid(0) = 0.5; threshold >= 0.5 -> foreground -> alpha 255.
func TestPostprocess_ZeroInputIsForeground(t *testing.T) {
	raw := make([]float32, ModelDim*ModelDim) // all zeros
	info := preprocessInfo{srcW: 1, srcH: 1, scaledW: 1, scaledH: 1, padLeft: (ModelDim - 1) / 2, padTop: (ModelDim - 1) / 2}

	mask, err := postprocess(raw, info)
	if err != nil {
		t.Fatalf("postprocess: %v", err)
	}
	if got, want := mask.Bounds().Dx(), 1; got != want {
		t.Errorf("mask w = %d, want %d", got, want)
	}
	if got, want := mask.Bounds().Dy(), 1; got != want {
		t.Errorf("mask h = %d, want %d", got, want)
	}
	// sigmoid(0) = 0.5, threshold >= 0.5 -> foreground -> 255.
	if got, want := mask.GrayAt(0, 0).Y, uint8(255); got != want {
		t.Errorf("mask pixel = %d, want %d (sigmoid(0)=0.5, threshold keeps it)", got, want)
	}
}

// Large positive raw values produce sigmoid -> ~1 -> foreground -> 255.
// Large negative values produce sigmoid -> ~0 -> background -> 0.
func TestPostprocess_ForegroundBackgroundThreshold(t *testing.T) {
	raw := make([]float32, ModelDim*ModelDim)
	// Fill the whole plane with a strongly negative value: background.
	for i := range raw {
		raw[i] = -10.0
	}
	info := preprocessInfo{srcW: 1, srcH: 1, scaledW: 1, scaledH: 1, padLeft: (ModelDim - 1) / 2, padTop: (ModelDim - 1) / 2}

	mask, err := postprocess(raw, info)
	if err != nil {
		t.Fatalf("postprocess: %v", err)
	}
	if got, want := mask.GrayAt(0, 0).Y, uint8(0); got != want {
		t.Errorf("background pixel = %d, want %d", got, want)
	}

	// Flip to strongly positive: foreground.
	for i := range raw {
		raw[i] = 10.0
	}
	mask, err = postprocess(raw, info)
	if err != nil {
		t.Fatalf("postprocess: %v", err)
	}
	if got, want := mask.GrayAt(0, 0).Y, uint8(255); got != want {
		t.Errorf("foreground pixel = %d, want %d", got, want)
	}
}

// Sigmoid correctness check in isolation.
func TestSigmoid(t *testing.T) {
	cases := []struct{ in, want float32 }{
		{0.0, 0.5},
		{-10.0, float32(1.0 / (1.0 + math.Exp(10)))},
		{10.0, float32(1.0 / (1.0 + math.Exp(-10)))},
	}
	for _, c := range cases {
		got := sigmoid(c.in)
		if math.Abs(float64(got-c.want)) > 1e-5 {
			t.Errorf("sigmoid(%f) = %f, want %f", c.in, got, c.want)
		}
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestPostprocess -v
```

Expected: build failure — `postprocess` and `sigmoid` undefined.

- [ ] **Step 3: Implement `postprocess.go`**

Create `tools/remove-bg/postprocess.go`:

```go
package main

import (
	"fmt"
	"image"
	"image/color"
	"math"

	"golang.org/x/image/draw"
)

// postprocess turns the raw [1,1,ModelDim,ModelDim] model output into a binary
// alpha mask of size info.srcW x info.srcH.
//
// Pipeline: sigmoid -> crop padding -> bilinear resize to src size -> threshold.
func postprocess(raw []float32, info preprocessInfo) (*image.Gray, error) {
	wantLen := ModelDim * ModelDim
	if len(raw) < wantLen {
		return nil, fmt.Errorf("mask data too short: got %d, want %d", len(raw), wantLen)
	}

	// Step 1: sigmoid into a ModelDim x ModelDim gray image (full plane, no crop yet).
	plane := image.NewGray(image.Rect(0, 0, ModelDim, ModelDim))
	for y := 0; y < ModelDim; y++ {
		for x := 0; x < ModelDim; x++ {
			p := sigmoid(raw[y*ModelDim+x])
			// Store as 0..255 for an intermediate high-precision resize step.
			plane.SetGray(x, y, color.Gray{Y: uint8(math.Round(p * 255))})
		}
	}

	// Step 2: crop the letterbox region.
	subRect := image.Rect(info.padLeft, info.padTop, info.padLeft+info.scaledW, info.padTop+info.scaledH)
	type subImage interface {
		SubImage(r image.Rectangle) image.Image
	}
	planes, ok := interface{}(plane).(subImage)
	if !ok {
		return nil, fmt.Errorf("internal: image.Gray does not expose SubImage")
	}
	cropped := image.NewGray(image.Rect(0, 0, info.scaledW, info.scaledH))
	draw.BiLinear.Scale(cropped, cropped.Bounds(), planes.SubImage(subRect), subRect, draw.Src, nil)

	// Step 3: resize cropped -> original size.
	dst := image.NewGray(image.Rect(0, 0, info.srcW, info.srcH))
	draw.BiLinear.Scale(dst, dst.Bounds(), cropped, cropped.Bounds(), draw.Src, nil)

	// Step 4: threshold at 0.5 (i.e. gray value >= 128).
	for i := 0; i < len(dst.Pix); i++ {
		if dst.Pix[i] >= 128 {
			dst.Pix[i] = 255
		} else {
			dst.Pix[i] = 0
		}
	}
	return dst, nil
}

func sigmoid(x float32) float32 {
	return float32(1.0 / (1.0 + math.Exp(-float64(x))))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestPostprocess -v
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/remove-bg/postprocess.go tools/remove-bg/postprocess_test.go
git commit -m "feat(remove-bg): add sigmoid + threshold postprocessing"
```

---

### Task 4: `composeAlpha` — apply mask to source (TDD)

**Files:**
- Create: `tools/remove-bg/compose.go`
- Create: `tools/remove-bg/compose_test.go`

**What it does:** Takes the original decoded image and the mask, returns an `*image.NRGBA` where RGB = original RGB and A = mask. Straight (non-premultiplied) alpha.

- [ ] **Step 1: Write the failing test**

Create `tools/remove-bg/compose_test.go`:

```go
package main

import (
	"image"
	"image/color"
	"testing"
)

func TestComposeAlpha_RGBFromSourceAlphaFromMask(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 2, 1))
	src.Set(0, 0, color.NRGBA{R: 10, G: 20, B: 30, A: 255})
	src.Set(1, 0, color.NRGBA{R: 40, G: 50, B: 60, A: 255})

	mask := image.NewGray(image.Rect(0, 0, 2, 1))
	mask.Pix[0] = 255 // foreground
	mask.Pix[1] = 0   // background

	out := composeAlpha(src, mask)
	if got, want := out.Bounds().Dx(), 2; got != want {
		t.Fatalf("w = %d, want %d", got, want)
	}
	p0 := out.NRGBAAt(0, 0)
	if p0.R != 10 || p0.G != 20 || p0.B != 30 || p0.A != 255 {
		t.Errorf("pixel 0 = %+v, want RGB from src + A=255", p0)
	}
	p1 := out.NRGBAAt(1, 0)
	if p1.R != 40 || p1.G != 50 || p1.B != 60 || p1.A != 0 {
		t.Errorf("pixel 1 = %+v, want RGB from src + A=0", p1)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestComposeAlpha -v
```

Expected: build failure — `composeAlpha` undefined.

- [ ] **Step 3: Implement `compose.go`**

Create `tools/remove-bg/compose.go`:

```go
package main

import (
	"image"
	"image/color"
)

// composeAlpha returns an NRGBA image with RGB taken from src and alpha taken
// from mask. Both must share the same bounds.
func composeAlpha(src image.Image, mask *image.Gray) *image.NRGBA {
	bounds := src.Bounds()
	out := image.NewNRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := color.NRGBAModel.Convert(src.At(x, y)).(color.NRGBA)
			a := mask.GrayAt(x, y).Y
			out.SetNRGBA(x, y, color.NRGBA{R: c.R, G: c.G, B: c.B, A: a})
		}
	}
	return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestComposeAlpha -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/remove-bg/compose.go tools/remove-bg/compose_test.go
git commit -m "feat(remove-bg): add alpha compositing"
```

---

### Task 5: `model.go` — registry + downloader (TDD)

**Files:**
- Create: `tools/remove-bg/model.go`
- Create: `tools/remove-bg/model_test.go`

**What it does:** Holds the model registry (key → file + URL), resolves a `--model` flag value (key or path) to a local `.onnx` file path, and downloads (with a progress line on stderr) if the file is missing.

- [ ] **Step 1: Write the failing test**

Create `tools/remove-bg/model_test.go`:

```go
package main

import "testing"

func TestModelRegistry_KnownKeys(t *testing.T) {
	cases := []struct {
		key       string
		wantFile  string
		wantURLHas string
	}{
		{"u2net", "u2net.onnx", "u2net.onnx"},
		{"u2netp", "u2netp.onnx", "u2netp.onnx"},
		{"u2net_human", "u2net_human_seg-8.onnx", "u2net_human_seg"},
	}
	for _, c := range cases {
		m, ok := lookupModel(c.key)
		if !ok {
			t.Errorf("lookupModel(%q) not found", c.key)
			continue
		}
		if m.file != c.wantFile {
			t.Errorf("model %q file = %q, want %q", c.key, m.file, c.wantFile)
		}
		if !contains(m.url, c.wantURLHas) {
			t.Errorf("model %q url = %q, want substring %q", c.key, m.url, c.wantURLHas)
		}
	}
}

func TestModelRegistry_UnknownKey(t *testing.T) {
	if _, ok := lookupModel("does-not-exist"); ok {
		t.Error("expected lookupModel to return false for unknown key")
	}
}

func contains(haystack, needle string) bool {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return len(needle) == 0
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestModelRegistry -v
```

Expected: build failure — `lookupModel`, `modelDef` undefined.

- [ ] **Step 3: Implement `model.go`**

Create `tools/remove-bg/model.go`:

```go
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// modelDef describes a downloadable U2Net-family model.
type modelDef struct {
	key  string
	file string
	url  string
}

// modelsDir is where downloaded .onnx files are cached. Override via
// MODELS_DIR env var; otherwise it is ./models relative to the executable's
// working directory.
func modelsDir() string {
	if v := os.Getenv("MODELS_DIR"); v != "" {
		return v
	}
	return "models"
}

// modelRegistry is the canonical list of supported models. URLs point at the
// upstream rembg project's published model files on Hugging Face.
var modelRegistry = []modelDef{
	{
		key:  "u2net",
		file: "u2net.onnx",
		url:  "https://huggingface.co/spaces/KenjieDec/RemBG/resolve/main/u2net.onnx",
	},
	{
		key:  "u2netp",
		file: "u2netp.onnx",
		url:  "https://huggingface.co/spaces/KenjieDec/RemBG/resolve/main/u2netp.onnx",
	},
	{
		key:  "u2net_human",
		file: "u2net_human_seg-8.onnx",
		url:  "https://huggingface.co/spaces/KenjieDec/RemBG/resolve/main/u2net_human_seg.onnx",
	},
}

func lookupModel(key string) (modelDef, bool) {
	for _, m := range modelRegistry {
		if m.key == key {
			return m, true
		}
	}
	return modelDef{}, false
}

// resolveModel resolves a --model flag value to a local .onnx path, downloading
// the model on first use if modelOrPath is a registry key. If modelOrPath ends
// in ".onnx", it is treated as a literal path and used as-is (no download).
//
// Set quiet=true to suppress the progress line on stderr.
func resolveModel(modelOrPath string, quiet bool) (string, error) {
	if strings.HasSuffix(modelOrPath, ".onnx") {
		// Literal path: verify it exists.
		if _, err := os.Stat(modelOrPath); err != nil {
			return "", fmt.Errorf("model file %s: %w", modelOrPath, err)
		}
		return modelOrPath, nil
	}

	m, ok := lookupModel(modelOrPath)
	if !ok {
		return "", fmt.Errorf("unknown model %q (known: u2net, u2netp, u2net_human) or pass a .onnx file path", modelOrPath)
	}

	dst := filepath.Join(modelsDir(), m.file)
	if _, err := os.Stat(dst); err == nil {
		return dst, nil
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("stat %s: %w", dst, err)
	}

	if err := os.MkdirAll(modelsDir(), 0o755); err != nil {
		return "", fmt.Errorf("mkdir %s: %w", modelsDir(), err)
	}
	if err := downloadFile(m.url, dst, quiet); err != nil {
		return "", fmt.Errorf("download %s: %w", m.url, err)
	}
	return dst, nil
}

// downloadFile streams url to dst with a one-line progress indicator on stderr
// when quiet is false. Uses a 32 KiB buffer.
func downloadFile(url, dst string, quiet bool) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d for %s", resp.StatusCode, url)
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	var w io.Writer = out
	// Progress is intentionally simple: a single "remove-bg: downloading..."
	// line. We avoid per-byte writes to stderr to keep the output clean.
	if !quiet {
		fmt.Fprintf(os.Stderr, "remove-bg: downloading %s ...\n", filepath.Base(dst))
	}
	_, err = io.CopyBuffer(w, resp.Body, make([]byte, 32*1024))
	return err
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestModelRegistry -v
```

Expected: both registry tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/remove-bg/model.go tools/remove-bg/model_test.go
git commit -m "feat(remove-bg): add model registry and downloader"
```

---

### Task 6: `remover.go` — orchestrator (TDD, golden test)

**Files:**
- Create: `tools/remove-bg/remover.go`
- Create: `tools/remove-bg/remover_test.go`
- Create: `tools/remove-bg/testdata/duck.jpg` (binary fixture — see step 1 for how to produce it)
- Create: `tools/remove-bg/testdata/duck.mask.golden.png` (committed once the pipeline runs green; see step 5)

**What it does:** `RemoveBg(Options)` wires together: resolve lib → init ONNX env → load session (reading input/output names dynamically) → preprocess → infer → postprocess → compose → encode PNG. Skips itself if the native lib is unavailable so the rest of the suite stays green on a fresh checkout.

- [ ] **Step 1: Add a test fixture**

You need a small rights-clear image to use as the golden-test input. The cleanest option is a generated synthetic image (no external rights concerns) — a 64x64 image with a solid colored circle on a contrasting background.

Create a tiny generator program in a throwaway file (do NOT commit it): `tools/remove-bg/cmd/gen-fixture/main.go`:

```go
package main

import (
	"image"
	"image/color"
	"image/jpeg"
	"os"
)

func main() {
	const S = 64
	img := image.NewRGBA(image.Rect(0, 0, S, S))
	// Background: blue.
	for y := 0; y < S; y++ {
		for x := 0; x < S; x++ {
			img.Set(x, y, color.RGBA{R: 30, G: 60, B: 200, A: 255})
		}
	}
	// Foreground: yellow circle, radius 24, centered.
	r := 24
	cx, cy := S/2, S/2
	for y := 0; y < S; y++ {
		for x := 0; x < S; x++ {
			dx, dy := x-cx, y-cy
			if dx*dx+dy*dy <= r*r {
				img.Set(x, y, color.RGBA{R: 240, G: 210, B: 40, A: 255})
			}
		}
	}
	f, _ := os.Create("tools/remove-bg/testdata/duck.jpg")
	defer f.Close()
	jpeg.Encode(f, img, &jpeg.Options{Quality: 90})
}
```

Run:
```bash
mkdir -p tools/remove-bg/testdata
go run ./tools/remove-bg/cmd/gen-fixture/main.go
ls -la tools/remove-bg/testdata/duck.jpg
# Expect a small (~1-3 KB) JPEG.
# Then DELETE the generator; it was a one-shot.
rm -rf tools/remove-bg/cmd/gen-fixture
```

Why "duck.jpg": the name is intentionally evocative (the canonical rembg test image is a rubber duck); our synthetic yellow circle on blue stands in for it and is rights-clear.

- [ ] **Step 2: Write the failing golden test**

Create `tools/remove-bg/remover_test.go`:

```go
package main

import (
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

// goldenTestLibEnv is the env var checked to decide whether to run the
// inference-dependent golden test. Set it to the path of libonnxruntime to
// enable; leave unset to skip.
const goldenTestLibEnv = "ONNXRUNTIME_LIB"

func TestRemoveBg_Golden(t *testing.T) {
	libPath := os.Getenv(goldenTestLibEnv)
	if libPath == "" {
		t.Skipf("%s not set; skipping inference-dependent golden test", goldenTestLibEnv)
	}

	input := filepath.Join("testdata", "duck.jpg")
	if _, err := os.Stat(input); err != nil {
		t.Fatalf("missing fixture %s: %v", input, err)
	}

	tmp := t.TempDir()
	out := filepath.Join(tmp, "out.png")
	err := RemoveBg(Options{
		InputPath:    input,
		OutputPath:   out,
		Model:        "u2net",
		OnnxLibPath:  libPath,
		Quiet:        true,
	})
	if err != nil {
		t.Fatalf("RemoveBg: %v", err)
	}

	got, err := loadPNG(out)
	if err != nil {
		t.Fatalf("load output: %v", err)
	}

	// On the first run, the golden does not exist yet. We write it so the
	// developer can inspect it before committing. Subsequent runs compare.
	goldenPath := filepath.Join("testdata", "duck.mask.golden.png")
	if _, err := os.Stat(goldenPath); os.IsNotExist(err) {
		if err := writePNG(goldenPath, got); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		t.Fatalf("golden %s did not exist; wrote it — re-run the test to compare. Inspect the file before committing.", goldenPath)
	}

	want, err := loadPNG(goldenPath)
	if err != nil {
		t.Fatalf("load golden: %v", err)
	}

	if !boundsEqual(got.Bounds(), want.Bounds()) {
		t.Fatalf("bounds mismatch: got %v want %v", got.Bounds(), want.Bounds())
	}

	// Compare alpha channel only — U2Net's exact mask can shift by a pixel or
	// two across versions, so we allow up to 5% of pixels to differ.
	diff, total := alphaDiff(got, want)
	if pct := float64(diff) / float64(total) * 100; pct > 5.0 {
		t.Errorf("mask differs from golden on %.2f%% of pixels (threshold 5%%)", pct)
	}
}

func loadPNG(p string) (image.Image, error) {
	f, err := os.Open(p)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, err := png.Decode(f)
	if err != nil {
		return nil, err
	}
	return img, nil
}

func writePNG(p string, img image.Image) error {
	f, err := os.Create(p)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, img)
}

func boundsEqual(a, b image.Rectangle) bool {
	return a.Min.X == b.Min.X && a.Min.Y == b.Min.Y && a.Max.X == b.Max.X && a.Max.Y == b.Max.Y
}

// alphaDiff returns (count of differing alpha pixels, total pixels).
func alphaDiff(a, b image.Image) (int, int) {
	bounds := a.Bounds()
	diff, total := 0, 0
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			total++
			ca := colA(a.At(x, y))
			cb := colA(b.At(x, y))
			// "Different" = the foreground/background classification flips
			// (alpha crosses 128). Tolerate small brightness shifts.
			fgA := ca >= 128
			fgB := cb >= 128
			if fgA != fgB {
				diff++
			}
		}
	}
	return diff, total
}

// colA extracts the 8-bit alpha from any color.Color.
func colA(c color.Color) uint8 {
	if n, ok := c.(color.NRGBA); ok {
		return n.A
	}
	_, _, _, a := c.RGBA()
	return uint8(a >> 8)
}
```

- [ ] **Step 3: Run the test to verify it skips**

Run:
```bash
cd tools/remove-bg && go test ./... -run TestRemoveBg_Golden -v
```

Expected: `--- SKIP: TestRemoveBg_Golden` because `ONNXRUNTIME_LIB` is unset. This confirms the test harness is correct before we add the production code.

- [ ] **Step 4: Implement `remover.go`**

Create `tools/remove-bg/remover.go`:

```go
package main

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"

	ort "github.com/yalue/onnxruntime_go"
)

// Options configures a single RemoveBg invocation.
type Options struct {
	InputPath   string // required
	OutputPath  string // required
	Model       string // registry key or .onnx path
	OnnxLibPath string // path to libonnxruntime shared lib
	Quiet       bool
}

// RemoveBg runs the full pipeline: decode -> preprocess -> infer -> postprocess
// -> compose -> encode.
func RemoveBg(opts Options) error {
	if err := validateOpts(opts); err != nil {
		return err
	}

	// 0. Resolve + load ONNX shared library.
	libPath, err := resolveOnnxLib(opts.OnnxLibPath)
	if err != nil {
		return err
	}
	ort.SetSharedLibraryPath(libPath)
	if err := ort.InitializeEnvironment(); err != nil {
		return fmt.Errorf("init onnxruntime: %w", err)
	}
	defer ort.DestroyEnvironment()

	// 1. Resolve the model file (downloads if needed).
	modelPath, err := resolveModel(opts.Model, opts.Quiet)
	if err != nil {
		return err
	}

	// 2. Read the input image.
	src, err := decodeImage(opts.InputPath)
	if err != nil {
		return fmt.Errorf("decode %s: %w", opts.InputPath, err)
	}

	// 3. Discover the model's actual input/output names (robust to variants).
	inputs, outputs, err := ort.GetInputOutputInfo(modelPath)
	if err != nil {
		return fmt.Errorf("read model metadata: %w", err)
	}
	if len(inputs) == 0 || len(outputs) == 0 {
		return fmt.Errorf("model %s has no inputs or outputs", modelPath)
	}
	inputName := inputs[0].Name
	outputName := outputs[0].Name

	// 4. Preprocess.
	tensor, info, err := preprocess(src)
	if err != nil {
		return fmt.Errorf("preprocess: %w", err)
	}

	// 5. Run inference.
	maskRaw, err := runInference(modelPath, inputName, outputName, tensor)
	if err != nil {
		return fmt.Errorf("inference: %w", err)
	}

	// 6. Postprocess.
	mask, err := postprocess(maskRaw, info)
	if err != nil {
		return fmt.Errorf("postprocess: %w", err)
	}

	// 7. Compose alpha.
	out := composeAlpha(src, mask)

	// 8. Encode PNG.
	if err := writePNGFile(opts.OutputPath, out); err != nil {
		return fmt.Errorf("write %s: %w", opts.OutputPath, err)
	}
	return nil
}

func validateOpts(opts Options) error {
	if opts.InputPath == "" {
		return fmt.Errorf("input path is required")
	}
	if opts.OutputPath == "" {
		return fmt.Errorf("output path is required")
	}
	if opts.Model == "" {
		return fmt.Errorf("model is required")
	}
	return nil
}

// resolveOnnxLib resolves the shared library path using the same precedence as
// the CLI: explicit > ONNXRUNTIME_LIB > error.
func resolveOnnxLib(explicit string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if v := os.Getenv("ONNXRUNTIME_LIB"); v != "" {
		return v, nil
	}
	return "", fmt.Errorf("onnxruntime shared library not found: pass --onnx-lib or set ONNXRUNTIME_LIB")
}

// runInference loads the model, runs a single forward pass, and returns the
// raw mask data (length ModelDim*ModelDim).
func runInference(modelPath, inputName, outputName string, inputData []float32) ([]float32, error) {
	inputShape := ort.NewShape(1, 3, int64(ModelDim), int64(ModelDim))
	inputTensor, err := ort.NewTensor[float32](inputShape, inputData)
	if err != nil {
		return nil, fmt.Errorf("create input tensor: %w", err)
	}
	defer inputTensor.Destroy()

	outputShape := ort.NewShape(1, 1, int64(ModelDim), int64(ModelDim))
	outputTensor, err := ort.NewEmptyTensor[float32](outputShape)
	if err != nil {
		return nil, fmt.Errorf("create output tensor: %w", err)
	}
	defer outputTensor.Destroy()

	session, err := ort.NewAdvancedSession(
		modelPath,
		[]string{inputName},
		[]string{outputName},
		[]ort.Value{inputTensor},
		[]ort.Value{outputTensor},
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}
	defer session.Destroy()

	if err := session.Run(); err != nil {
		return nil, fmt.Errorf("run: %w", err)
	}
	out := outputTensor.GetData()
	// Copy so the caller owns the slice (the tensor is destroyed on return).
	cp := make([]float32, len(out))
	copy(cp, out)
	return cp, nil
}

// decodeImage reads JPEG/PNG/WebP from disk.
func decodeImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	return img, err
}

func writePNGFile(path string, img image.Image) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, img)
}
```

- [ ] **Step 5: Add deps, format, build**

Run:
```bash
cd tools/remove-bg && go mod tidy && gofmt -w *.go
```

Expected: `go.sum` updated with `github.com/yalue/onnxruntime_go`. `go build ./...` should succeed (it will not actually load the lib at build time — only at runtime).

Run:
```bash
cd tools/remove-bg && go build ./...
```

Expected: no output, exit 0.

- [ ] **Step 6: Run the golden test against a real lib + model**

To actually run the golden test, you need the ONNXRuntime shared library downloaded (Task 8 provides a task for that; you can also do it manually here).

Manual setup if you want to run the golden test now:
```bash
# From repo root, run the future download-onnxruntime task once it exists;
# for now, fetch onnxruntime v1.26.0 manually for your host:
#   macOS arm64:  onnxruntime-darwin-arm64-1.26.0.tgz
#   macOS x86_64: onnxruntime-darwin-x86_64-1.26.0.tgz
#   linux arm64:  onnxruntime-linux-aarch64-1.26.0.tgz
#   linux x86_64: onnxruntime-linux-x64-1.26.0.tgz
# Extract and point ONNXRUNTIME_LIB at lib/libonnxruntime.dylib (or .so).
```

Then run:
```bash
cd tools/remove-bg && \
  ONNXRUNTIME_LIB=/path/to/libonnxruntime.dylib \
  go test ./... -run TestRemoveBg_Golden -v
```

Expected on first run: the test FAILS with the message "golden ... did not exist; wrote it — re-run the test to compare". Inspect `testdata/duck.mask.golden.png`: it should show the original 64x64 image with the yellow circle preserved and the blue background turned transparent.

Re-run the same command. Expected: PASS.

If the mask is clearly wrong (e.g. all-transparent or all-opaque), stop and debug — do not commit a broken golden.

- [ ] **Step 7: Commit**

```bash
git add tools/remove-bg/remover.go tools/remove-bg/remover_test.go tools/remove-bg/testdata/duck.jpg tools/remove-bg/testdata/duck.mask.golden.png tools/remove-bg/go.mod tools/remove-bg/go.sum
git commit -m "feat(remove-bg): add RemoveBg orchestrator with golden test"
```

---

### Task 7: `main.go` — CLI

**Files:**
- Create: `tools/remove-bg/main.go`

**What it does:** Parses flags, calls `RemoveBg`, maps errors to exit codes, formats stderr.

- [ ] **Step 1: Implement `main.go`**

Create `tools/remove-bg/main.go`:

```go
package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Exit codes (kept stable; documented in README and the design spec).
const (
	exitOK       = 0
	exitUsage    = 2
	exitModel    = 3
	exitInfer    = 4
	exitIO       = 5
	exitInternal = 1
)

func main() {
	os.Exit(run())
}

func run() int {
	var (
		outPath  string
		model    string
		onnxLib  string
		quiet    bool
		showVer  bool
	)
	fs := flag.NewFlagSet("remove-bg", flag.ContinueOnError)
	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, "usage: remove-bg <input-image>\n\n")
		fs.PrintDefaults()
	}
	fs.StringVar(&outPath, "o", "", "output path (default: <input-basename>-no-bg.png next to input)")
	fs.StringVar(&outPath, "out", "", "output path (alias for -o)")
	fs.StringVar(&model, "m", "u2net", "model key (u2net|u2netp|u2net_human) or path to a .onnx file")
	fs.StringVar(&model, "model", "u2net", "alias for -m")
	fs.StringVar(&onnxLib, "onnx-lib", "", "path to libonnxruntime shared lib")
	fs.BoolVar(&quiet, "q", false, "suppress progress messages on stderr")
	fs.BoolVar(&quiet, "quiet", false, "alias for -q")
	fs.BoolVar(&showVer, "version", false, "print version and exit")

	if err := fs.Parse(os.Args[1:]); err != nil {
		return exitUsage
	}
	if showVer {
		fmt.Println("remove-bg v0.1.0")
		return exitOK
	}
	if fs.NArg() != 1 {
		fs.Usage()
		fmt.Fprintf(os.Stderr, "remove-bg: expected exactly one input image, got %d\n", fs.NArg())
		return exitUsage
	}
	input := fs.Arg(0)

	if outPath == "" {
		base := strings.TrimSuffix(filepath.Base(input), filepath.Ext(input))
		outPath = filepath.Join(filepath.Dir(input), base+"-no-bg.png")
	}

	err := RemoveBg(Options{
		InputPath:   input,
		OutputPath:  outPath,
		Model:       model,
		OnnxLibPath: onnxLib,
		Quiet:       quiet,
	})
	if err == nil {
		if !quiet {
			fmt.Fprintf(os.Stderr, "remove-bg: wrote %s\n", outPath)
		}
		return exitOK
	}
	fmt.Fprintf(os.Stderr, "remove-bg: %v\n", err)
	return classifyError(err)
}

// classifyError maps an error returned by RemoveBg to a stable exit code.
func classifyError(err error) int {
	var pErr *os.PathError
	if errors.As(err, &pErr) {
		return exitIO
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "unknown model"),
		strings.Contains(msg, "onnxruntime shared library not found"),
		strings.Contains(msg, "download "),
		strings.Contains(msg, "HTTP "):
		return exitModel
	case strings.Contains(msg, "decode "),
		strings.Contains(msg, "inference"),
		strings.Contains(msg, "preprocess"),
		strings.Contains(msg, "postprocess"),
		strings.Contains(msg, "create session"),
		strings.Contains(msg, "read model metadata"):
		return exitInfer
	case strings.Contains(msg, "write "):
		return exitIO
	}
	return exitInternal
}
```

- [ ] **Step 2: Build it**

Run:
```bash
cd tools/remove-bg && go build -o ./bin/remove-bg .
```

Expected: `./bin/remove-bg` exists, exit 0.

- [ ] **Step 3: Smoke test the CLI**

```bash
cd tools/remove-bg && ./bin/remove-bg --version
```

Expected: prints `remove-bg v0.1.0` and exits 0.

```bash
cd tools/remove-bg && ./bin/remove-bg 2>&1; echo "exit=$?"
```

Expected: prints usage line and `exit=2`.

- [ ] **Step 4: Commit**

```bash
git add tools/remove-bg/main.go
git commit -m "feat(remove-bg): add CLI with exit-code mapping"
```

---

### Task 8: `cmd/download-onnxruntime` — host-aware lib fetcher

**Files:**
- Create: `tools/remove-bg/cmd/download-onnxruntime/main.go`

**What it does:** Detects `runtime.GOOS`/`runtime.GOARCH`, downloads the matching ONNXRuntime v1.26.0 release tarball, extracts just the shared library and `LICENSE.txt` into `tools/remove-bg/lib/`.

- [ ] **Step 1: Implement the fetcher**

Create `tools/remove-bg/cmd/download-onnxruntime/main.go`:

```go
// Command download-onnxruntime fetches the ONNXRuntime shared library for the
// current host into tools/remove-bg/lib/. Run via:
//
//	mise run download-onnxruntime
//
// (or `go run ./tools/remove-bg/cmd/download-onnxruntime`).
package main

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
)

const onnxVersion = "1.26.0"

type asset struct {
	goos   string
	goarch string
	file   string // tarball filename
	lib    string // path inside the tarball to the shared lib
}

// Known host triples. If your host is not listed, the tool exits with an error
// pointing at the README.
var assets = []asset{
	{"darwin", "arm64", "onnxruntime-darwin-arm64-" + onnxVersion + ".tgz", "lib/libonnxruntime.dylib"},
	{"darwin", "amd64", "onnxruntime-darwin-x86_64-" + onnxVersion + ".tgz", "lib/libonnxruntime.dylib"},
	{"linux", "arm64", "onnxruntime-linux-aarch64-" + onnxVersion + ".tgz", "lib/libonnxruntime.so." + onnxVersion},
	{"linux", "amd64", "onnxruntime-linux-x64-" + onnxVersion + ".tgz", "lib/libonnxruntime.so." + onnxVersion},
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "download-onnxruntime: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	a, err := pickAsset()
	if err != nil {
		return err
	}

	// Resolve the lib directory relative to repo root (two levels up from this
	// binary's source dir). We compute it from the working directory assumption
	// that the user runs us from the repo root.
	libDir := filepath.Join("tools", "remove-bg", "lib")
	if err := os.MkdirAll(libDir, 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", libDir, err)
	}

	url := "https://github.com/microsoft/onnxruntime/releases/download/v" + onnxVersion + "/" + a.file
	fmt.Fprintf(os.Stderr, "download-onnxruntime: fetching %s\n", url)
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d for %s", resp.StatusCode, url)
	}

	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return fmt.Errorf("gunzip: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	libBase := filepath.Base(a.lib)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read tar: %w", err)
		}
		base := filepath.Base(hdr.Name)
		if base != libBase && base != "LICENSE.txt" {
			continue
		}
		dst := filepath.Join(libDir, base)
		f, err := os.Create(dst)
		if err != nil {
			return err
		}
		if _, err := io.Copy(f, tr); err != nil {
			f.Close()
			return err
		}
		f.Close()
		fmt.Fprintf(os.Stderr, "download-onnxruntime: wrote %s\n", dst)
	}
	return nil
}

func pickAsset() (asset, error) {
	for _, a := range assets {
		if a.goos == runtime.GOOS && a.goarch == runtime.GOARCH {
			return a, nil
		}
	}
	return asset{}, fmt.Errorf("no onnxruntime asset for %s/%s — see tools/remove-bg/README.md", runtime.GOOS, runtime.GOARCH)
}
```

- [ ] **Step 2: Format and build**

Run:
```bash
cd tools/remove-bg && gofmt -w cmd/download-onnxruntime/main.go && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Smoke test (no network assertion)**

```bash
cd tools/remove-bg && go vet ./cmd/download-onnxruntime
```

Expected: no output. (We do not actually run the downloader here — it would hit the network. Task 10 covers the full end-to-end run.)

- [ ] **Step 4: Commit**

```bash
git add tools/remove-bg/cmd/download-onnxruntime
git commit -m "feat(remove-bg): add download-onnxruntime helper"
```

---

### Task 9: `mise.toml` + README

**Files:**
- Create: `.mise.toml` (repo root) — **already created in the reordered Task 1, just verify it exists**
- Create: `tools/remove-bg/README.md`

- [x] **Step 1: Write `.mise.toml`** (done up front — see commit `c2ce9b1`)

`.mise.toml` (root) already contains:

```toml
[tools]
go = "1.22"

[tasks.build-remove-bg]
description = "Build the background-removal CLI into tools/remove-bg/bin/"
run = "go build -C tools/remove-bg -o ./bin/remove-bg ."

[tasks.download-onnxruntime]
description = "Fetch the ONNXRuntime shared lib for this host into tools/remove-bg/lib/"
run = "go run ./tools/remove-bg/cmd/download-onnxruntime"

[tasks.test-remove-bg]
description = "Run the remove-bg test suite (skips inference tests unless ONNXRUNTIME_LIB is set)"
depends = ["build-remove-bg"]
run = "cd tools/remove-bg && go test ./..."
```

Verify with `cat .mise.toml`. If it matches, skip to Step 2. If not, restore from the snippet above and commit.

Note: `go build -C tools/remove-bg` requires Go 1.20+ (we are on 1.22). The `-C` flag changes directory before building, which lets us keep the output path relative to the module.

- [ ] **Step 2: Write `tools/remove-bg/README.md`**

Create `tools/remove-bg/README.md`:

````markdown
# remove-bg

A local background-removal CLI for the orthoam.sk marketing site. Runs a U2Net
ONNX model via ONNXRuntime; writes a transparent PNG next to the input.

## Quick start

```bash
# 1. Install Go 1.22+ and mise.
mise install

# 2. Fetch the ONNXRuntime shared lib for your host.
mise run download-onnxruntime

# 3. Build the CLI.
mise run build-remove-bg

# 4. Remove a background.
ONNXRUNTIME_LIB=$(pwd)/tools/remove-bg/lib/libonnxruntime.dylib \
  tools/remove-bg/bin/remove-bg docs/img/profile-224x300.jpg
# Writes docs/img/profile-no-bg.png
```

## CLI reference

```
remove-bg <input-image>

Flags:
  -o, --out PATH        output path (default: <input-basename>-no-bg.png)
  -m, --model KEY|PATH  u2net (default) | u2netp | u2net_human | /path/to/file.onnx
      --onnx-lib PATH   path to libonnxruntime shared lib
  -q, --quiet           suppress progress on stderr
      --version         print version and exit
```

You can also set `ONNXRUNTIME_LIB` instead of passing `--onnx-lib`.

## Exit codes

| Code | Meaning                                                  |
|------|----------------------------------------------------------|
| 0    | success                                                  |
| 2    | usage / flag error                                       |
| 3    | model or ONNXRuntime library error (download, load)      |
| 4    | inference error (unsupported input, session failure)     |
| 5    | IO error (cannot read input, cannot write output)        |

## Models

The first time you use a registered model, `remove-bg` downloads it from the
upstream rembg project's Hugging Face space into `tools/remove-bg/models/`
(gitignored). To use a custom model, pass a path:

```bash
remove-bg input.png -m /path/to/my-model.onnx
```

## Tests

The golden test requires the ONNXRuntime shared lib. Without it, the test is
skipped so `go test ./...` is green on a fresh checkout.

```bash
mise run download-onnxruntime
cd tools/remove-bg
ONNXRUNTIME_LIB=$(pwd)/lib/libonnxruntime.dylib go test ./...
```

## Troubleshooting

- **"onnxruntime shared library not found"** — run `mise run download-onnxruntime` or set `ONNXRUNTIME_LIB`.
- **"HTTP 404"** on model download — the upstream URL changed. Open the README, find the new URL on the rembg Hugging Face space, and update `modelRegistry` in `model.go`.
- **Slow first run** — the model download (~44 MB for u2net) happens once per model.
````

- [ ] **Step 3: Verify mise picks up the tasks**

Run:
```bash
mise tasks
```

Expected: lists `build-remove-bg`, `download-onnxruntime`, `test-remove-bg`.

- [ ] **Step 4: Commit**

```bash
git add .mise.toml tools/remove-bg/README.md
git commit -m "docs(remove-bg): add mise config and README"
```

---

### Task 10: End-to-end smoke test

**Files:** none (this is verification only)

- [ ] **Step 1: Install mise tools**

Run:
```bash
mise install
```

Expected: Go 1.22+ installed locally (or already present).

- [ ] **Step 2: Fetch the ONNXRuntime lib**

Run:
```bash
mise run download-onnxruntime
ls -la tools/remove-bg/lib/
```

Expected: `libonnxruntime.dylib` (or `.so`) and `LICENSE.txt` present.

- [ ] **Step 3: Build**

Run:
```bash
mise run build-remove-bg
ls -la tools/remove-bg/bin/remove-bg
```

Expected: binary exists.

- [ ] **Step 4: Download the default model**

Run (this also verifies the model URL is live):
```bash
cd tools/remove-bg && \
  ONNXRUNTIME_LIB=$(pwd)/lib/libonnxruntime.dylib \
  ./bin/remove-bg testdata/duck.jpg -o /tmp/duck-out.png
ls -la tools/remove-bg/models/
```

Expected: `u2net.onnx` (~44 MB) downloaded; `/tmp/duck-out.png` written; stderr prints `remove-bg: wrote /tmp/duck-out.png`.

- [ ] **Step 5: Verify the result**

Open `/tmp/duck-out.png` (or use the Playwright MCP / macOS `open`):

```bash
open /tmp/duck-out.png
```

Expected: a 64x64 image with the yellow circle preserved and the blue background transparent. If the mask is inverted (yellow removed, blue kept), the model expects a different output semantics — debug `postprocess` before declaring done.

- [ ] **Step 6: Run the full test suite**

Run:
```bash
cd tools/remove-bg && \
  ONNXRUNTIME_LIB=$(pwd)/lib/libonnxruntime.dylib \
  go test ./... -v
```

Expected: all tests PASS (golden test now runs because `ONNXRUNTIME_LIB` is set).

- [ ] **Step 7: Run on a real site image**

Pick a real fixture and run it to confirm the tool works on representative input:

```bash
cd /Users/juraj/Documents/MISC/orthoam.sk && \
  tools/remove-bg/bin/remove-bg docs/img/profile-224x300.jpg \
    -o /tmp/profile-no-bg.png
```

Inspect `/tmp/profile-no-bg.png`. The doctor portrait should have its background removed. If the background has visible artifacts at edges, that is expected from U2Net at this resolution; it is not a bug to fix in v1.

- [ ] **Step 8: Final commit (if anything changed)**

If the smoke test surfaced fixes, commit them. Otherwise no commit. Run:
```bash
git status
```

If clean, done. If not, commit with a clear message describing the fix.

---

## Self-review

After Task 10, with everything committed, do a final pass:

- [ ] Run `cd tools/remove-bg && go vet ./...` — must be clean.
- [ ] Run `cd tools/remove-bg && gofmt -l .` — must list no files.
- [ ] Run `cd tools/remove-bg && go test ./...` without `ONNXRUNTIME_LIB` — golden test must SKIP, all others PASS.
- [ ] Confirm `tools/remove-bg/bin/`, `tools/remove-bg/models/`, `tools/remove-bg/lib/` are gitignored: `git status --ignored tools/remove-bg/`.

---

## Notes for the executor

- If `golang.org/x/image/webp` is needed later (the spec lists it as a dependency), it is imported automatically when you call `image.Decode` on a WebP file — provided you import the package for its `init()` side effect. Add a blank import `_ "golang.org/x/image/webp"` to `remover.go` only when you actually have a WebP input to test against. Do not add it preemptively.
- `image.Decode` relies on registered formats. `remover.go` imports `image/jpeg` and `image/png`, which registers both for decode (PNG is also used by the encoder). WebP is not registered by default — see the previous note.
