import {bouquet, initial, bloomIds, stemNames} from './floristry.js';
import {prepare, makeView} from './flower-view.js';

const formIds = [31, 32, 33, 34, 35, 36, 37];
const angles = [['正面', 0, 0], ['侧面', Math.PI / 2, 0], ['顶视', 0, Math.PI / 2]];
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 540;
const view = makeView(canvas);
const detail = document.getElementById('detail');

function isolatedStem(kind) {
  const state = {...initial, blooms:[bloomIds.indexOf(kind)], sprigs:[], stems:[[kind, 0]]};
  const model = bouquet(state);
  const indices = [];
  for (const [i, range] of model.ranges.entries()) {
    if (range.key !== kind + '-0') continue;
    const end = model.ranges[i + 1]?.start ?? model.indices.length;
    for (let j = range.start; j < end; j++) indices.push(model.indices[j]);
  }
  if (!indices.length) throw new Error('缺少花材 ' + kind);
  return prepare({...model, indices, wrapStart:indices.length, cardStart:indices.length}, 0, 0);
}

// The workbench camera rotates around (0, .04, 0). Reframe after lighting so the
// specimen fills each plate equally, including the much shorter top projection.
function fittedView(mesh, yaw, pitch) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), ct = Math.cos(pitch), st = Math.sin(pitch);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < mesh.length; i += 6) {
    const x = mesh[i] * cs - mesh[i+2] * sn;
    const y = (mesh[i+1] - .04) * ct - (mesh[i] * sn + mesh[i+2] * cs) * st;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const shifted = new Float32Array(mesh);
  for (let i = 0; i < shifted.length; i += 6) {
    shifted[i] -= midX * cs - midY * sn * st;
    shifted[i+1] -= midY * ct;
    shifted[i+2] -= -midX * sn - midY * cs * st;
  }
  view.setZoom(5.13 * .84 / Math.max(maxX - minX, maxY - minY, .01));
  view.setMesh(shifted);
  view.render(yaw, pitch);
  return canvas.toDataURL('image/png');
}

async function renderGallery() {
  const list = document.getElementById('specimens');
  for (const kind of formIds) {
    const name = stemNames[kind], mesh = isolatedStem(kind);
    const section = document.createElement('section'), title = document.createElement('h2');
    title.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'views';
    section.append(title, grid);
    for (const [label, yaw, pitch] of angles) {
      const image = new Image(), button = document.createElement('button');
      button.type = 'button'; button.className = 'view';
      const description = name + ' · ' + label;
      image.src = fittedView(mesh, yaw, pitch); image.alt = description;
      button.setAttribute('aria-label', '放大' + description);
      button.append(image, label);
      button.onclick = () => {
        const large = document.getElementById('large');
        large.src = image.src; large.alt = description;
        document.getElementById('detail-name').textContent = description;
        detail.showModal();
      };
      grid.append(button);
    }
    list.append(section);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  document.getElementById('status').hidden = true;
}
renderGallery().catch(error => {
  console.error(error);
  document.getElementById('status').textContent = '有花材未能绘制，请刷新重试。';
});
