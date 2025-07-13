import Worker from "./entry.worker?worker";

const worker = new Worker();

worker.addEventListener("message", (event) => {
  const target = document.querySelector("#result");
  if (target) {
    target.textContent = JSON.stringify(event.data, null, 2);
  }
});
