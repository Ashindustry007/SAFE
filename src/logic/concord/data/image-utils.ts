/**
 * Ported from concord-consortium/wildfire-model (MIT).
 *
 * Loads image data and populates a grid array with optional interpolation.
 * Note: image origin (0,0) is top-left, grid origin (0,0) is bottom-left.
 */
 
export const populateGrid = (
  width: number,
  height: number,
  image: number[][],
  interpolate = false
): number[] => {
  const arr: number[] = [];
  const imageHeight = image.length;
  const imageWidth = image[0].length;
  const numGridCellsPerImageRowPixel = interpolate ? (imageHeight - 1) / (height - 1) : imageHeight / height;
  const numGridCellsPerImageColPixel = interpolate ? (imageWidth - 1) / (width - 1) : imageWidth / width;

  let imageRowIndex = imageHeight - 1;
  let imageRowAdvance = 0;

  for (let r = 0; r < height; r++) {
    let imageColIndex = 0;
    let imageColAdvance = 0;
    for (let c = 0; c < width; c++) {
      let value = image[imageRowIndex][imageColIndex];
      if (interpolate) {
        const bottomLeft = image[imageRowIndex][imageColIndex];
        const bottomRight = imageColIndex + 1 < imageWidth ? image[imageRowIndex][imageColIndex + 1] : bottomLeft;
        const topLeft = imageRowIndex - 1 >= 0 ? image[imageRowIndex - 1][imageColIndex] : bottomLeft;
        const topRight =
          imageRowIndex - 1 >= 0
            ? (imageColIndex + 1 < imageWidth ? image[imageRowIndex - 1][imageColIndex + 1] : topLeft)
            : bottomRight;
        value =
          bottomLeft * (1 - imageColAdvance) * (1 - imageRowAdvance) +
          bottomRight * imageColAdvance * (1 - imageRowAdvance) +
          topLeft * (1 - imageColAdvance) * imageRowAdvance +
          topRight * imageColAdvance * imageRowAdvance;
      }
      arr.push(value);
      imageColAdvance += numGridCellsPerImageColPixel;
      if (imageColAdvance >= 1) {
        imageColIndex += Math.floor(imageColAdvance);
        imageColAdvance -= Math.floor(imageColAdvance);
      }
    }
    imageRowAdvance += numGridCellsPerImageRowPixel;
    if (imageRowAdvance >= 1) {
      imageRowIndex -= Math.floor(imageRowAdvance);
      imageRowAdvance -= Math.floor(imageRowAdvance);
    }
  }
  return arr;
};

export const getImageData = (
  imgSrc: string,
  mapColor: (rgba: [number, number, number, number]) => number
): Promise<number[][]> => {
  return new Promise((resolve, reject) => {
    const imageLoaded = (img: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("can't get 2d canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const rawData: ImageData = ctx.getImageData(0, 0, img.width, img.height);
      const data: number[][] = [];

      for (let y = 0; y < rawData.height; y += 1) {
        const row: number[] = [];
        data.push(row);
        for (let x = 0; x < rawData.width * 4; x += 4) {
          const rIdx = y * (rawData.width * 4) + x;
          row.push(
            mapColor([
              rawData.data[rIdx],
              rawData.data[rIdx + 1],
              rawData.data[rIdx + 2],
              rawData.data[rIdx + 3],
            ])
          );
        }
      }
      resolve(data);
    };

    const img = document.createElement("img");
    img.src = imgSrc;
    img.crossOrigin = "anonymous";

    if (img.complete) {
      imageLoaded(img);
    } else {
      img.addEventListener("load", () => imageLoaded(img));
      img.addEventListener("error", () => reject(new Error(`Cannot load image ${imgSrc}`)));
    }
  });
};

export const getInputData = async (
  input: number[][] | string | undefined,
  gridWidth: number,
  gridHeight: number,
  interpolate: boolean,
  mapColor: (rgba: [number, number, number, number]) => number
): Promise<number[] | undefined> => {
  if (input === undefined) return undefined;
  if (Array.isArray(input)) {
    return populateGrid(gridWidth, gridHeight, input as number[][], interpolate);
  }
  const image = await getImageData(input as string, mapColor);
  return populateGrid(gridWidth, gridHeight, image, interpolate);
};

