export async function getMapKit(): Promise<typeof mapkit> {
  if (window.mapkit && window.mapkit.loadedLibraries.length !== 0) {
    return window.mapkit;
  }
  await new Promise<void>((resolve) => {
    window.initMapKit = resolve;
  });
  delete window.initMapKit;
  return window.mapkit;
}
