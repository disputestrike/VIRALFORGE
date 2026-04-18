Place the optional continue-or-pivot ONNX classifier assets here:

- `bargein_classifier.onnx`
- `bargein_classifier_tokenizer/tokenizer.json`

The runtime will automatically use the ONNX classifier when these files are present and
fall back to deterministic continue/pivot rules when they are missing or unavailable.
