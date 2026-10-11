// Студия ~30 м² из ручной сметы.
export const STUDIO_30 = {
  height: 2.7,
  rooms: [
    { type: 'living', name: 'Комната-кухня', length: 5.2, width: 4 },
    { type: 'hall', name: 'Коридор', length: 3, width: 1.4 },
    { type: 'bath', name: 'Санузел', length: 2, width: 2 },
  ],
  options: {
    laminate: 'lam-expert', wallpaper: 'wp-grey', door: 'door-palitra', electric: 'el-ekf-black',
    spot: 'spot-gx53', spotsCount: 20, tileWall: 'tw-beige', tileFloor: 'tf-albus',
    toilet: 'wc-ampm-like', bath: 'bath-acryl', bathFaucet: 'bf-flumen-rois',
    sink: 'sink-cabinet', sinkFaucet: 'sf-ampm-like', towel: 'towel-water',
  },
};
