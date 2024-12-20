import { Storage } from "@google-cloud/storage";
import * as tf from "@tensorflow/tfjs-node";
import path from "path";

let model;

export async function loadModel() {
  if (!model) {
    const storage = new Storage();
    const bucket = storage.bucket("model-ml-server"); // Pastikan nama bucket sesuai
    const modelDir = "/tmp";

    // Daftar file yang perlu diunduh
    const files = [
      "model-in-prod/model.json",
      "model-in-prod/group1-shard1of4.bin",
      "model-in-prod/group1-shard2of4.bin",
      "model-in-prod/group1-shard3of4.bin",
      "model-in-prod/group1-shard4of4.bin",
    ];

    console.log("Mengunduh file model...");

    // Unduh semua file model ke folder /tmp
    for (const file of files) {
      const destination = path.join(modelDir, path.basename(file));
      console.log(`Mengunduh ${file} ke ${destination}...`);
      await bucket.file(file).download({ destination });
    }

    console.log("Semua file model berhasil diunduh.");

    // Load model dari file lokal
    const modelFile = path.join(modelDir, "model.json");
    model = await tf.loadLayersModel(`file://${modelFile}`);
    console.log("Model berhasil dimuat.");
  }
  return model;
}

export async function predictImage(model, image) {
  try {
    const imageBuffer = image._data;

    // Konversi buffer ke tensor
    const tensor = tf.node
      .decodeImage(imageBuffer)
      .resizeNearestNeighbor([224, 224]) // Resolusi sesuai model
      .toFloat()
      .expandDims(0); // Tambahkan batch dimensi

    console.log("Melakukan prediksi...");
    // Prediksi menggunakan model
    const prediction = model.predict(tensor);
    const result = prediction.dataSync()[0] > 0.5 ? "Cancer" : "Non-cancer";
    const suggestion =
      result === "Cancer"
        ? "Segera periksa ke dokter!"
        : "Penyakit kanker tidak terdeteksi.";

    return { result, suggestion };
  } catch (error) {
    console.error("Error saat prediksi:", error.message);
    throw new Error("Gagal memproses gambar untuk prediksi.");
  }
}
