const Hapi = require("@hapi/hapi");
const { nanoid } = require("nanoid");
const { loadModel, predictImage } = require("./inference"); // Fungsi untuk memuat model dan prediksi
const { storePrediction } = require("../utils/firestore"); // Fungsi untuk menyimpan data ke Firestore

(async () => {
  // Memuat model machine learning dari Cloud Storage
  const model = await loadModel();
  console.log("Model loaded!");

  // Inisialisasi server Hapi
  const server = Hapi.server({
    host: process.env.NODE_ENV !== "production" ? "localhost" : "0.0.0.0",
    port: 3000,
  });

  // Definisi endpoint POST /predict
  server.route({
    method: "POST",
    path: "/predict",
    handler: async (request, h) => {
      try {
        const { image } = request.payload;

        // Lakukan prediksi
        const { result, suggestion } = await predictImage(model, image);

        // Buat data prediksi
        const id = nanoid(); // Generate ID unik
        const predictionData = {
          id,
          result,
          suggestion,
          createdAt: new Date().toISOString(),
        };

        // Simpan hasil prediksi ke Firestore
        await storePrediction(predictionData);

        // Kembalikan respons sukses
        return h
          .response({
            status: "success",
            message: "Model is predicted successfully",
            data: predictionData,
          })
          .code(200);
      } catch (error) {
        console.error("Prediction Error:", error);

        // Jika terjadi kesalahan saat prediksi
        return h
          .response({
            status: "fail",
            message: "Terjadi kesalahan dalam melakukan prediksi",
          })
          .code(400);
      }
    },
    options: {
      payload: {
        allow: "multipart/form-data", // Izinkan pengunggahan file
        multipart: true, // Aktifkan parsing multipart
        output: "stream", // Gunakan stream untuk membaca file
        maxBytes: 1000000, // Batasi ukuran file maksimal 1MB
        parse: true,
      },
      ext: {
        onPreResponse: {
          method: (request, h) => {
            // Penanganan kesalahan jika file melebihi ukuran maksimal
            if (
              request.response.isBoom &&
              request.response.output.statusCode === 413
            ) {
              return h
                .response({
                  status: "fail",
                  message:
                    "Payload content length greater than maximum allowed: 1000000",
                })
                .code(413);
            }
            return h.continue;
          },
        },
      },
    },
  });

  // Jalankan server
  await server.start();
  console.log(`Server started at: ${server.info.uri}`);
})();
