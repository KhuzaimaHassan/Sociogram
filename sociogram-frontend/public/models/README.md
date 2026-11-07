# Bundled expression models

These two model families are copied unchanged from the official
[face-api.js 0.22.2 release](https://github.com/justadudewhohacks/face-api.js/tree/8609b25a15f417398a4d2b95dc91985cd1e0c0c3/weights),
matching the frontend dependency. The upstream MIT license is included in `LICENSE`.

- TinyFaceDetector: manifest and `tiny_face_detector_model-shard1`
- FaceExpressionNet: manifest and `face_expression_model-shard1`

Vite copies these files unchanged to `dist/models/`. Both the feed detector and
the mobile client's hosted `/expression` page load them from the same origin;
there is no runtime dependency on a model CDN.

`integrity.json` records the upstream commit and each asset's SHA-256. Run
`npm run verify:models` to check the source assets, or
`npm run verify:models -- dist/models` to check a build. The build checks both.

Supplying weights establishes availability, not recognition accuracy. Camera
access still requires consent and browser permission. Model-loading failure
keeps manual reactions available.
