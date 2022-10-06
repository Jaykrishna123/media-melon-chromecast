'use strict';

import { CastQueue } from './queuing.js';
import { AdsTracker, SenderTracker, ContentTracker } from './cast_analytics.js';

/**
 * Constants to be used for fetching media by entity from sample repository.
 */
const ID_REGEX = '\/?([^\/]+)\/?$';
const CONTENT_URL =
  'https://storage.googleapis.com/cpe-sample-media/content.json';

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

var mmvjs7Plugin = new VideoJSMMSSIntgr();






const LOG_RECEIVER_TAG = 'Receiver';
let customData;
let metadata;
/**
 * Debug Logger
 */
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

/**
 * WARNING: Make sure to turn off debug logger for production release as it
 * may expose details of your app.
 * Uncomment below line to enable debug logger and show a 'DEBUG MODE' tag at
 * top left corner.
 */
castDebugLogger.setEnabled(true);

/**
 * Uncomment below line to show debug overlay.
 */
castDebugLogger.showDebugLogs(true);

/**
 * Set verbosity level for Core events.
 */
castDebugLogger.loggerLevelByEvents = {
  // 'cast.framework.events.category.CORE':
  //   cast.framework.LoggerLevel.INFO,
  // 'cast.framework.events.EventType.MEDIA_STATUS':
  // cast.framework.LoggerLevel.DEBUG
};

if (!castDebugLogger.loggerLevelByTags) {
  // castDebugLogger.loggerLevelByTags = {};
}

/**
 * Set verbosity level for custom tag.
 * Enables log messages for error, warn, info and debug.
 */
castDebugLogger.loggerLevelByTags[LOG_RECEIVER_TAG] =
  cast.framework.LoggerLevel.DEBUG;

// castDebugLogger.debug("Media Melon WATCHED", LOG_RECEIVER_TAG)
// castDebugLogger.error(LOG_RECEIVER_TAG, "Media Melon WATCHED")

castDebugLogger.debug("mmvjs7Plugin", mmvjs7Plugin);


castDebugLogger.debug("CONTEXT", context)

/**
 * Example of how to listen for events on playerManager.
 */
playerManager.addEventListener(
  cast.framework.events.EventType.ERROR, (event) => {
    castDebugLogger.error(LOG_RECEIVER_TAG,
      'Detailed Error Code - ' + event.detailedErrorCode);
    if (event && event.detailedErrorCode == 905) {
      castDebugLogger.error(LOG_RECEIVER_TAG,
        'LOAD_FAILED: Verify the load request is set up ' +
        'properly and the media is able to play.');
    }
  });

playerManager.addEventListener(
  cast.framework.events.EventType.CLIP_ENDED, (event) => {
    castDebugLogger.debug("CLIP_ENDED", JSON.stringify(event))
    castDebugLogger.debug("customData", JSON.stringify(customData))
    const videoProgress = Math.floor((event.currentMediaTime / customData.dur * 100))
    const progress = videoProgress <= 1 ? 1 : videoProgress >= 95 ? 95 : videoProgress;

    castDebugLogger.debug("PROGRESS", JSON.stringify(progress))
    castDebugLogger.debug("POST_DATA : ", JSON.stringify({ asset_id: customData._id, progress: progress }))
    var xhttp = new XMLHttpRequest();

    if (progress > 0) {
      try {
        xhttp.open("POST", "https://api.travelxp.com/watch/watched", true);
        xhttp.setRequestHeader('Content-type', 'application/json');
        xhttp.setRequestHeader('Accept', 'application/json');
        xhttp.setRequestHeader('Authorization', 'Bearer ' + customData.Authorization);
        xhttp.onreadystatechange = function () {
          if (xhttp.readyState === 4 && xhttp.status === 200) {
            castDebugLogger.debug("SUCCESS WATCHED", JSON.stringify(xhttp.status))
          }
          else if (xhttp.readyState === 4) {
            var responseData = JSON.parse(xhttp.response);
            castDebugLogger.debug("ERRO DATA", JSON.stringify(responseData))
            castDebugLogger.debug("FAIL WATCHED", JSON.stringify(xhttp.status))
          }
        }
        xhttp.send(JSON.stringify({ asset_id: customData._id, progress: progress }));
      } catch (error) {

      }
    }
  });

/**
 * Example analytics tracking implementation. See cast_analytics.js. Must
 * complete TODO item in google_analytics.js.
 */
const adTracker = new AdsTracker();
const senderTracker = new SenderTracker();
const contentTracker = new ContentTracker();
// adTracker.startTracking();
// senderTracker.startTracking();
// contentTracker.startTracking();

/**
 * Adds an ad to the beginning of the desired content.
 * @param {cast.framework.messages.MediaInformation} mediaInformation The target
 * mediainformation. Usually obtained through a load interceptor.
 */
function addBreaks(mediaInformation) {
  return fetchMediaById('fbb_ad')
    .then((clip1) => {
      mediaInformation.breakClips = [
        {
          id: 'fbb_ad',
          title: clip1.title,
          contentUrl: clip1.stream.dash,
          contentType: 'application/dash+xml',
          whenSkippable: 5
        }
      ];

      mediaInformation.breaks = [
        {
          id: 'pre-roll',
          breakClipIds: ['fbb_ad'],
          position: 0
        }
      ];
    });
}


/**
 * Intercept the LOAD request to load and set the contentUrl and add ads.
 */
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD, loadRequestData => {

    // If the loadRequestData is incomplete return an error message
    if (!loadRequestData || !loadRequestData.media) {
      const error = new cast.framework.messages.ErrorData(
        cast.framework.messages.ErrorType.LOAD_FAILED);
      error.reason = cast.framework.messages.ErrorReason.INVALID_REQUEST;
      return error;
    }

    // check all content source fields for asset URL or ID
    let source = loadRequestData.media.contentUrl
      || loadRequestData.media.entity || loadRequestData.media.contentId;

    // If there is no source or a malformed ID then return an error.
    if (!source || source == "" || !source.match(ID_REGEX)) {
      let error = new cast.framework.messages.ErrorData(
        cast.framework.messages.ErrorType.LOAD_FAILED);
      error.reason = cast.framework.messages.ErrorReason.INVALID_REQUEST;
      return error;
    }


    // Add breaks to the media information and set the contentUrl
    // return addBreaks(loadRequestData.media)

    // DRM
    customData = loadRequestData.media.customData;
    metadata = loadRequestData.media.metadata;
    castDebugLogger.debug("MEDIA", JSON.stringify(loadRequestData.media))

    if (loadRequestData.media.customData) {
      playerManager.setMediaPlaybackInfoHandler((loadRequest, playbackConfig) => {
        playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
        playbackConfig.licenseUrl = loadRequestData.media.customData.licenseUrl;

        playbackConfig.licenseRequestHandler = requestInfo => {
          requestInfo.headers = loadRequestData.media.customData.headers;
        };
        return playbackConfig
      });

      //intialize Media Melon


      castDebugLogger.debug("CUSTOMDATA", customData)
      castDebugLogger.debug("METADATA", metadata)


      // let username = customData.username;
      // let SUBSCRIBETYPE;
      // let SUBSCRIBETAG;
      // let planame = this.context?.watch?.plan?.plan_name;

      // if (!username) {

      //   SUBSCRIBETYPE = "Guest"
      //   SUBSCRIBETAG = "Guest"

      // }
      // else {

      //   if (!planame) {

      //     SUBSCRIBETYPE = "Unsubscribed"
      //     SUBSCRIBETAG = "LoggedIn"
      //   }

      //   else {
      //     SUBSCRIBETYPE = "Subscribed"
      //     SUBSCRIBETAG = planame

      //   }
      // }

      // options.mmVideoAssetInfo = {
      //   "assetName": data.type === "program" ? data.program_name : data.title,
      //   "assetId": data._id,
      //   "videoId": data._id,
      //   "contentType": data.title ? 'Episode' : 'Trailor',
      //   "title": data.type === "program" ? data.program_name : data.title,
      //   "drmProtection": drmType,
      //   "episodeNumber": data.episode,
      //   "season": data.season,
      //   "seriesTitle": data.program_name,
      //   "videoType": "SVOD",
      // }
  



      // if (mmvjs7Plugin?.getRegistrationStatus() === false) {
      //   mmvjs7Plugin?.registerMMSmartStreaming("VideoJS", "476976526",
      //     username,
      //     "www.travelxp.com",
      //     SUBSCRIBETYPE,
      //     SUBSCRIBETAG);
      //   mmvjs7Plugin?.reportPlayerInfo("VideoJS", "VIDEOJS", '7.19.2');
      // }

      // let mediaUrl = this.props.videojsoptions.src;
      // let mmVideoAssetInfo = this.props.videojsoptions.mmVideoAssetInfo


      // this.player.src({
      //   src: mediaUrl,
      //   mmVideoAssetInfo: mmVideoAssetInfo
      // })



      // mmvjs7Plugin?.initialize(this.player, mediaUrl, mmVideoAssetInfo, null);




      //initialize youbora plugin
      // let options = {
      //   "enable": true,
      //   "username": customData.username,
      //   'session.context': true, // *read context note
      //   "content.title": metadata.title,
      //   "content.duration": customData.dur,
      //   "content.isLive": false,
      //   'content.id': customData._id,
      //   'content.type': metadata.subtitle === "" ? "Trailer" : "Episode",
      //   'content.program': metadata.subtitle === "" ? metadata.title : metadata.subtitle
      // }
      // castDebugLogger.debug("OPTIONS",JSON.stringify(options))
      // castDebugLogger.debug("YOUBORA_TYPE",typeof youbora)
      // if (typeof youbora != "undefined") {
      //   window.plugin = new youbora.Plugin({ accountCode: 'travelxpdev' });
      //   castDebugLogger.debug("PLUGIN_TYPE",typeof window.plugin)
      //   plugin.setOptions(options);
      //   try {
      //   plugin.setAdapter(new youbora.adapters.Chromecast('castMediaElement'))
      //   }
      //   catch(error){
      //     castDebugLogger.error("YOUBORA_ADAPTER",error)
      //   }
      // }
    }
    return loadRequestData;
  }
);

const playbackConfig = new cast.framework.PlaybackConfig();

/**
 * Set the player to start playback as soon as there are five seconds of
 * media content buffered. Default is 10.
 */
playbackConfig.autoResumeDuration = 5;

/**
 * Set the control buttons in the UI controls.
 */
const controls = cast.framework.ui.Controls.getInstance();
controls.clearDefaultSlotAssignments();

/**
 * Assign buttons to control slots.
 */
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_SECONDARY_1,
  cast.framework.ui.ControlsButton.QUEUE_PREV
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_PRIMARY_1,
  cast.framework.ui.ControlsButton.CAPTIONS
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_PRIMARY_2,
  cast.framework.ui.ControlsButton.SEEK_FORWARD_15
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_SECONDARY_2,
  cast.framework.ui.ControlsButton.QUEUE_NEXT
);

context.start({
  // queue: new CastQueue(),
  playbackConfig: playbackConfig,
  supportedCommands: cast.framework.messages.Command.ALL_BASIC_MEDIA |
    cast.framework.messages.Command.QUEUE_PREV |
    cast.framework.messages.Command.QUEUE_NEXT |
    cast.framework.messages.Command.STREAM_TRANSFER
});
