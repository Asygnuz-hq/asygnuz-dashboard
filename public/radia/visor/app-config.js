/** @type {AppTypes.Config} */

// Secure, minimal default configuration.
//
// This is what a plain production build with no APP_CONFIG produces, so it is
// deliberately locked down:
//   - The local file data source (`dicomlocal`) and the runtime `?url=` sources
//     (`dicomjson`, `dicomwebproxy`) are NOT enabled — they widen the attack
//     surface of a default deployment.
//   - `?customization=` URL loading is OFF: no `customizationUrlPrefixes` are
//     configured, so any `?customization=` value is rejected (and aborts boot
//     rather than silently loading).
//   - `dangerouslyUseDynamicConfig` (the `configUrl` query parameter) is off.
//
// It does not need to "just work" untouched — point the data source below at
// your own DICOMweb server. For a fully-featured setup with every data source
// and customization loading enabled, see config/dev.js (local development) and
// config/netlify.js (the public demo deploy).
window.config = {
  name: 'config/default.js',
  routerBasename: '/radia/visor',
  // whiteLabeling: {},
  extensions: [],
  modes: [],
  customizationService: {},

  // --- URL-driven customizations (?customization=) ----------------------------
  // OFF by default. To allow loading customization data files from the URL, set
  // `customizationUrlPrefixes` to a map of allowed prefixes. The `default` prefix
  // (no slashes) is used for values with no leading slash; every other prefix
  // must start AND end with a slash and is matched against the leading
  // `/segment/` of the value. Files are fetched and parsed as JSONC data — they
  // are never executed. Example (left disabled here on purpose):
  //
  // customizationUrlPrefixes: {
  //   default: './customizations/',                       // ?customization=tools/ctPresets
  //   '/remote/': 'https://cdn.example.com/ohif-custom/', // ?customization=/remote/siteA
  // },
  // ----------------------------------------------------------------------------

  // --- Native ("next") Generic Viewport --------------------------------------
  // OFF by default. Set `enabled: true` (or pass ?useNextViewports=true in the
  // URL) to drive viewports through cornerstone's native GenericViewport
  // ("next") API instead of the legacy Stack/Volume viewport classes.
  genericViewports: {
    enabled: false,
    // Render backend selection: 'cpu' | 'webgl' | 'auto' | a backend id
    // registered via cornerstone's registerRenderBackend (e.g. a webgpu
    // backend), or a map with per-viewport-type overrides, e.g.
    // { default: 'webgl', orthographic: 'cpu' }. The matching URL params take
    // precedence per-session: ?viewportRendering=cpu and
    // ?orthographic.viewportRendering=cpu.
    // viewportRendering: 'auto',
  },
  // ----------------------------------------------------------------------------
  showStudyList: true,
  // some windows systems have issues with more than 3 web workers
  maxNumberOfWebWorkers: 3,
  // below flag is for performance reasons, but it might not work for all servers
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  experimentalStudyBrowserSort: false,
  strictZSpacingForVolumeViewport: true,
  groupEnabledModesFirst: true,
  allowMultiSelectExport: false,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 5,
    // Prefetch number is dependent on the http protocol. For http 2 or
    // above, the number of requests can be go a lot higher.
    prefetch: 25,
  },
  showErrorDetails: 'always', // 'always', 'dev', 'production'
  // `dangerouslyUseDynamicConfig` (load configuration from a `configUrl` query
  // parameter) is intentionally left OFF in the secure default build. See
  // config/dev.js for the documented shape.
  defaultDataSourceName: 'dicomlocal',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: { friendlyName: 'Estudio local (demo Radia)' },
    },
  ],
  httpErrorHandler: error => {
    // This is 429 when rejected from the public idc sandbox too often.
    console.warn(error.status);

    // Could use services manager here to bring up a dialog/modal if needed.
    console.warn('test, navigate to https://ohif.org/');
  },
};
