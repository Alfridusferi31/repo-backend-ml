const { Storage } = require("@google-cloud/storage");
const tf = require("@tensorflow/tfjs-node");
const path = require("path");

let model;

async function loadModel() {
  if (!model) {
    const storage = new Storage();
    const bucket = storage.bucket("your-bucket-name"); // Ganti dengan nama bucket Anda
    const modelFile = path.join("/tmp", "model.json");

    // Download model dari Google Cloud Storage
    await bucket.file("model/model.json").download({ destination: modelFile });
    model = await tf.loadLayersModel(`file://${modelFile}`);
  }
  return model;
}

async function predictImage(model, image) {
  const imageBuffer = image._data;
  const tensor = tf.node
    .decodeImage(imageBuffer)
    .resizeNearestNeighbor([224, 224])
    .toFloat()
    .expandDims(0);

  // Prediksi menggunakan model
  const prediction = model.predict(tensor);
  const result = prediction.dataSync()[0] > 0.5 ? "Cancer" : "Non-cancer";
  const suggestion =
    result === "Cancer"
      ? "Segera periksa ke dokter!"
      : "Penyakit kanker tidak terdeteksi.";

  return { result, suggestion };
}

module.exports = { loadModel, predictImage };
