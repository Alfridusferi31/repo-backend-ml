const Hapi = require("@hapi/hapi");
const { loadModel, predictImage } = require("./inference"); // Mengimpor model dan fungsi prediksi
const { storePrediction } = require("./utils/firestore"); // Mengimpor fungsi untuk menyimpan hasil prediksi ke Firestore

(async () => {
  // Memuat dan mendapatkan model machine learning
  const model = await loadModel();
  console.log("Model loaded!");

  // Inisialisasi server HTTP
  const server = Hapi.server({
    host: process.env.NODE_ENV !== "production" ? "localhost" : "0.0.0.0",
    port: 3000,
  });

  // Definisikan rute untuk endpoint prediksi
  server.route({
    method: "POST",
    path: "/predicts",
    handler: async (request) => {
      // Ambil gambar yang di-upload oleh pengguna
      const { image } = request.payload;

      // Lakukan prediksi dengan memberikan model dan gambar
      const { result, suggestion } = await predictImage(model, image);

      // Menyimpan hasil prediksi ke Firestore
      const predictionData = {
        result,
        suggestion,
        createdAt: new Date().toISOString(),
      };
      await storePrediction(predictionData);

      // Mengembalikan hasil prediksi
      return {
        status: "success",
        message: "Prediction made successfully",
        data: predictionData,
      };
    },
    options: {
      payload: {
        allow: "multipart/form-data", // Izinkan multipart untuk upload file
        multipart: true, // Menyokong multipart untuk menerima file gambar
      },
    },
  });

  // Menjalankan server
  await server.start();
  console.log(`Server started at: ${server.info.uri}`);
})();
