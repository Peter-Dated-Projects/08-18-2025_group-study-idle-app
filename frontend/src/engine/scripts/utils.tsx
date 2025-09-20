interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadTextFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then(resolve)
      .catch(reject);
  });
}

function loadJsonFile<T>(file: string): Promise<T> {
  return new Promise((resolve, reject) => {
    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(resolve)
      .catch(reject);
  });
}

export type { Rect };
export { loadTextFile, loadJsonFile };
