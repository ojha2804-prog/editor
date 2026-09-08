// SSMClient: Solid Solutions

/* --- SWOOD CLIENT LOADER (do not remove) ---------------------------------
 * data-settings.js is loaded and awaited BEFORE view-settings.js, so this is
 * the earliest safe hook for the parallel customisation layer.
 * ---------------------------------------------------------------------- */
if (typeof window !== 'undefined' && !window.__SWOOD_CLIENT_LOADING__) {
	window.__SWOOD_CLIENT_LOADING__ = true
	var swcScript = document.createElement('script')
	swcScript.src = 'assets/settings/swood-client.js'
	swcScript.async = false
	swcScript.onerror = function () { console.warn('swood-client.js not found - running stock report') }
	document.head.appendChild(swcScript)
}

const dataSettings = {
	roundDimensionsToNearestFraction: false,
	useLengthAsLongestEdge: true,
	dimensionPrecision: 2,
	anglePrecision: 2,
	/* true  = one record per physical instance, so a frame with Qty 5
	          produces 5 records numbered instance 1..5 and the labels
	          page prints 5 labels reading 1 of 5 .. 5 of 5.
	   false = one record per unique item, carrying a quantity. That is
	          why every label printed 1 of 1.
	   Turning this on makes every list longer - panels, parts, labels.
	   Set back to false if the tables become unwieldy. */
	/* REVERTED TO false - true was a mistake.
	   true makes one record per physical instance, each with quantity 1.
	   On Assem1 that gave 108 panel rows, 960 hardware rows, repeated Saw
	   Machine Data, and every Qty collapsed to 1 - the frames lost the
	   project quantity of 10 altogether.
	   The only thing it bought was labels printing one card per instance,
	   which is not worth wrecking every quantity in the report. */
	instantiateData: false,
	/* SET TO false TO BREAK A STALE CACHE.
	   true makes the app build the data model once and keep it in IndexedDB:

	       const e = await V1.system_report.get(i.project.key)
	       if (e) { return e.data }        // cached model, settings ignored

	   Keyed by project, so every later load replays the FIRST model built -
	   which is why Panels stayed at 108 rows no matter what instantiateData
	   said, and why Ctrl+F5 changed nothing. IndexedDB survives a hard
	   refresh.

	   false rebuilds the model from db/report-data-raw.js on every load, so
	   data-settings.js is honoured every time. The cost is that edits made
	   inside the report (editable cells, damaged flags, comments) no longer
	   persist between visits.

	   TO GET CACHING BACK once the numbers are right: open the report once
	   with this false so the correct model is built, then set it back to
	   true and the good model gets cached instead of the bad one. */
	useLocalDatabase: false,
}

try {
	module.exports = dataSettings
} catch {}
