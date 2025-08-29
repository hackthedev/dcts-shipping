var COOKIE_BIT = 'settings.vc.mic.bitrate';
var COOKIE_DEV = 'settings.vc.mic.deviceId';
var COOKIE_NOISE = 'settings.vc.mic.noiseSuppression';
var COOKIE_ECHO = 'settings.vc.mic.echoCancellation';

var micSelect = document.getElementById('vc-mic');
var bitrateSlider = document.getElementById('vc-br');
var bitrateOut = document.getElementById('vc-br-val');
var voiceSaveButton = document.getElementById('vc-save');
var voiceTestButton = document.getElementById('vc-test');
var voiceRefreshButton = document.getElementById('vc-refresh');
var voiceDefaultcheck = document.getElementById('vc-mic-default');
var voiceLoopbackAudio = document.getElementById('vc-loopback');
var voiceEchoCancellation = document.getElementById("vc-mic-echoCancellation");
var voiceNoiseSuppression = document.getElementById("vc-mic-noiseSuppression");

var activeStream = null;
var isTesting = false;

function setSaveEnabled(on = true) {
  voiceSaveButton.disabled = !on;
}

async function ensureAudioInputLabels() {
  const hasLabels = (await navigator.mediaDevices.enumerateDevices())
    .some(d => d.kind === 'audioinput' && d.label);
  if (hasLabels) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    s.getTracks().forEach(t => t.stop());
  } catch { }
}

async function getAudioInputDevices() {
  await ensureAudioInputLabels();
  const devs = await navigator.mediaDevices.enumerateDevices();
  return devs
    .filter(d => d.kind === 'audioinput')
    .map(d => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }));
}

function stopCurrentMicStream() {
  try { activeStream?.getTracks().forEach(t => t.stop()); } catch { }
  activeStream = null;
}

async function startSelectedMicStream(deviceId) {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 48000
  };
  const audio = deviceId ? { ...base, deviceId: { exact: deviceId } } : base;
  stopCurrentMicStream();
  const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
  activeStream = stream;
  return stream;
}

function readBitrateKbpsFromCookie() {
  const bps = parseInt(CookieManager.getCookie(COOKIE_BIT) || '', 10);
  if (!Number.isFinite(bps) || bps <= 0) return 128;
  const kbps = Math.round(bps / 1000);
  return Math.min(192, Math.max(100, kbps));
}

function writeBitrateToCookieFromUI() {
  const kbps = parseInt(bitrateSlider.value, 10) || 128;
  CookieManager.setCookie(COOKIE_BIT, String(kbps * 1000), 365);
}

function writeEchoCancellationFromUI() {
  const echoCancellation = voiceEchoCancellation.checked;
  CookieManager.setCookie(COOKIE_ECHO, echoCancellation, 365);
}

function writeNoiseSuppressionFromUI() {
  const noiseSuppression = voiceNoiseSuppression.checked;
  CookieManager.setCookie(COOKIE_NOISE, noiseSuppression, 365);
}

function readEchoCancellationFromCookie() {
  const v = CookieManager.parseBool(CookieManager.getCookie(COOKIE_ECHO));
  return v ?? true; 
}

function readNoiseSuppressionFromCookie() {
  const v = CookieManager.parseBool(CookieManager.getCookie(COOKIE_NOISE));
  return v ?? true;
}



function readDefaultDeviceFromCookie() {
  return CookieManager.getCookie(COOKIE_DEV) || '';
}

function writeDefaultDeviceCookieFromUI() {
  if (voiceDefaultcheck.checked) CookieManager.setCookie(COOKIE_DEV, micSelect.value, 365);
  else CookieManager.setCookie(COOKIE_DEV, '', 365);
}

async function renderMicOptions() {
  try {
    const list = await getAudioInputDevices();
    const savedDev = readDefaultDeviceFromCookie();

    micSelect.innerHTML = '';

    const sys = document.createElement('option');
    sys.value = '';
    sys.textContent = 'System Default';
    micSelect.appendChild(sys);

    for (const d of list) {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label;
      micSelect.appendChild(o);
    }

    if (savedDev && Array.from(micSelect.options).some(o => o.value === savedDev)) {
      micSelect.value = savedDev;
      voiceDefaultcheck.checked = true;
    } else {
      micSelect.value = '';
      voiceDefaultcheck.checked = false;
    }
  } catch {
    micSelect.innerHTML = '<option>Kein Mikro gefunden</option>';
    voiceDefaultcheck.checked = false;
  }
}

function initBitrateUI() {
  const kbps = readBitrateKbpsFromCookie();
  bitrateSlider.value = kbps;
  bitrateOut.textContent = kbps;

  voiceEchoCancellation.checked = readEchoCancellationFromCookie();
  voiceNoiseSuppression.checked = readNoiseSuppressionFromCookie();
}

function currentKbpsFromUI() {
  return parseInt(bitrateSlider.value, 10) || 128;
}

async function applyAndSaveSettings() {
  try {
    voiceSaveButton.disabled = true;

    const stream = await startSelectedMicStream(micSelect.value);

    writeBitrateToCookieFromUI();
    writeDefaultDeviceCookieFromUI();
    writeEchoCancellationFromUI();
    writeNoiseSuppressionFromUI();

    const kbps = currentKbpsFromUI();
    const detail = {
      deviceId: micSelect.value || null,
      kbps,
      bps: kbps * 1000,
      stream,
      track: stream.getAudioTracks()[0] || null
    };
    window.dispatchEvent(new CustomEvent('micsettingschange', { detail }));

    if (isTesting) {
      voiceLoopbackAudio.srcObject = stream;
      try { await voiceLoopbackAudio.play(); } catch { }
    }

    setSaveEnabled(false);

    showSystemMessage({
      title: "Saved settings!",
      text: "",
      icon: "success",
      img: null,
      type: "success",
      duration: 4000
    });

  } catch {
    voiceSaveButton.disabled = false;
  }
}

async function toggleMicTest() {
  try {
    if (!isTesting) {
      const kbps = currentKbpsFromUI();

      CookieManager.setCookie(COOKIE_BIT, String(kbps * 1000), 365);
      if (voiceDefaultcheck.checked) CookieManager.setCookie(COOKIE_DEV, micSelect.value, 365);

      const s = activeStream || await startSelectedMicStream(micSelect.value);
      voiceLoopbackAudio.srcObject = s;
      voiceLoopbackAudio.muted = false;

      await voiceLoopbackAudio.play();

      isTesting = true;
      voiceTestButton.textContent = 'Stop Test';
    }
    else {
      voiceLoopbackAudio.pause();
      voiceLoopbackAudio.srcObject = null;

      isTesting = false;
      voiceTestButton.textContent = 'Mic Test';
    }
  } catch { }
}

function bindUI() {
  bitrateSlider.addEventListener('input', () => {
    bitrateOut.textContent = bitrateSlider.value;
    setSaveEnabled();
  });

  micSelect.addEventListener('change', () => {
    const saved = readDefaultDeviceFromCookie();
    voiceDefaultcheck.checked = (micSelect.value === saved);
    setSaveEnabled();
  });

  voiceEchoCancellation.addEventListener('change', () => {
    writeEchoCancellationFromUI();
    setSaveEnabled();
  });

  voiceNoiseSuppression.addEventListener('change', () => {
    writeNoiseSuppressionFromUI();
    setSaveEnabled();
  });

  voiceDefaultcheck.addEventListener('change', () => {
    writeDefaultDeviceCookieFromUI();
    setSaveEnabled();
  });

  voiceRefreshButton.addEventListener('click', () => {
    renderMicOptions();
  });

  voiceSaveButton.addEventListener('click', () => {
    applyAndSaveSettings();
  });

  voiceTestButton.addEventListener('click', () => {
    toggleMicTest();
  });

  navigator.mediaDevices?.addEventListener?.('devicechange', () => {
    renderMicOptions();
  });
}

async function initVoiceSettingsPanel() {
  initBitrateUI();
  await renderMicOptions();
  bindUI();
}

initVoiceSettingsPanel();