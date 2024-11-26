const { Firestore } = require("@google-cloud/firestore");
const db = new Firestore();

async function storePrediction(data) {
  const predictionsRef = db.collection("predictions");
  await predictionsRef.add(data);
}

module.exports = { storePrediction };
