import * as druid from "@saehrimnir/druidjs";
import { encodeMechanicsLDA } from "./preprocessing.js";

export function computeLDAProjection(data, targetDim = 2) {
  const { encoded } = encodeMechanicsLDA(data);
  const rawMatrix = encoded.map(d => d.vector);
  const labels = encoded.map(d => d.label);

  console.log(`📊 Matrix shape: ${rawMatrix.length} x ${rawMatrix[0].length}`);
  console.log(`🏷️ Label distribution:`, countLabels(labels));
  console.log("🔢 Sample vectors:", rawMatrix.slice(0, 3).map(v => v.slice(0, 10)));

  const matrix = druid.Matrix.from(rawMatrix);
  console.log("🧪 Is matrix a Matrix?", matrix instanceof druid.Matrix);

  const pca = new druid.PCA(matrix, { d: 20 });
  const reduced = pca.transform();

  const lda = new druid.LDA(reduced, { labels, d: targetDim });
  const transformedMatrix = lda.transform();

  const transformed = transformedMatrix.to2dArray;

  return transformed.map((point, i) => ({
    title: encoded[i].title,
    label: encoded[i].label,
    rating: encoded[i].rating,
    mechanics: encoded[i].mechanics,
    x: point[0],
    y: point[1],
  }));
}

function countLabels(labels) {
  return labels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}
