---
"@ggsvelte/core": patch
---

Discrete colour/fill legend keys for point-family layers now use the layer's constant shape (param, aes constant, or default circle) instead of anonymous coloured squares, so multi-layer charts like Snow cholera (grey death points + red pump crosses) stay readable without colour alone.
