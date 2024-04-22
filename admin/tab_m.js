/*global $, location,  document, window, io, alert, systemLang, translateAll*/
const path = location.pathname;

let isDebug = false;

if (location.host === 'localhost:5500') {
    isDebug = true;
}

const parts = path.split('/');
parts.splice(-3);

let socket;

if (isDebug) {
    socket = io.connect('http://172.23.215.95:8081/', { path: 'socket.io' });
} else {
    socket = io.connect('/', { path: parts.join('/') + '/socket.io' });
}

const query = (window.location.search || '').replace(/^\?/, '').replace(/#.*$/, '');
const args = {};

// parse parameters
query.trim().split('&').filter(function (t) { return t.trim(); }).forEach(function (b, i) {
    const parts = b.split('=');
    if (!i && parts.length === 1 && !isNaN(parseInt(b, 10))) {
        args.instance = parseInt(b, 10);
    }
    const name = parts[0];
    args[name] = parts.length === 2 ? parts[1] : true;

    if (name === 'instance') {
        args.instance = parseInt(args.instance, 10) || 0;
    }

    if (args[name] === 'true') {
        args[name] = true;
    } else if (args[name] === 'false') {
        args[name] = false;
    }
});

let instance = args.instance;

if (typeof instance === 'undefined') {
    instance = 0;
}

const namespace = 'gree-hvac.' + instance;
// const namespace = 'gree-hvac.0';

const Materialize = (typeof M !== 'undefined') ? M : Materialize;// eslint-disable-line no-undef

socket.emit('subscribe', namespace + '.*');

socket.on('stateChange', function (id, state) {
    if (id.substring(0, namespace.length) !== namespace) return;
    const parts = id.split('.');
    const stateId = parts[parts.length - 1];
    const deviceId = parts[parts.length - 2];
    processStateChange(deviceId, stateId, state.val);
});

function processStateChange(deviceId, stateId, stateVal) {
    switch (stateId) {
        case 'target-temperature':
            $('#' + `${deviceId}-target-temperature`).text(stateVal);
            break;
        case 'mode':
            switch (stateVal) {
                case 0:
                    $('#' + `${deviceId}-hvac-mode`).text('autorenew');
                    break;
                case 1:
                    $('#' + `${deviceId}-hvac-mode`).text('mode_cool');
                    break;
                case 2:
                    $('#' + `${deviceId}-hvac-mode`).text('water_drop');
                    break;
                case 3:
                    $('#' + `${deviceId}-hvac-mode`).text('mode_fan');
                    break;
                case 4:
                    $('#' + `${deviceId}-hvac-mode`).text('sunny');
                    break;
            }
            break;
        case 'power':
            if (stateVal === 1) {
                $('#' + `${deviceId}-on-off-btn`).addClass('power-on');
            } else {
                $('#' + `${deviceId}-on-off-btn`).removeClass('power-on');
            }
            break;
        case 'turbo':
            if (stateVal === 1) {
                $('#' + `${deviceId}-turbo-btn`).addClass('turbo-on');
            } else {
                $('#' + `${deviceId}-turbo-btn`).removeClass('turbo-on');
            }
            break;
        case 'display-state':
            if (stateVal === 1) {
                $('#' + `${deviceId}-display-btn`).addClass('display-on');
            } else {
                $('#' + `${deviceId}-display-btn`).removeClass('display-on');
            }
            break;
        case 'fan-speed':
            if (stateVal === 0) {
                $('#' + `${deviceId}-fan-mode`).css('display', 'block');
                $('#' + `${deviceId}-fan-speed`).css('display', 'none');
            } else {
                $('#' + `${deviceId}-fan-mode`).css('display', 'none');
                $('#' + `${deviceId}-fan-speed`).css('display', 'block');
                if (stateVal === 1) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_1_bar');
                } else if (stateVal === 3) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_2_bar');
                } else if (stateVal === 5) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt');
                }
            }
    }
}

let systemConfig; // eslint-disable-line no-unused-vars
let devices = [];

$(document).ready(function () {
    'use strict';
    loadSystemConfig(function () {
        if (typeof translateAll === 'function') {
            translateAll();
        }
        getDevices();
    });
});


function getDevices() {
    sendTo(namespace, 'getDevices', {}, function (msg) {
        if (msg) {
            if (msg.error) {
                console.log('Error: ' + msg.error);
            } else {
                console.log('msg: ' + msg);
                devices = JSON.parse(msg);
                showDevices();
            }
        }
    });
}

function showDevices() {
    let html = '';
    if (!devices || !devices.length || devices.length === 0) {
        return;
    } else {
        for (let i = 0; i < devices.length; i++) {
            const d = devices[i];
            const card = getCard(d);
            html += card;
        }
    }
    $('#devices').html(html);
    for (let i = 0; i < devices.length; i++) {
        const d = devices[i];
        for (const key in d) {
            if (Object.prototype.hasOwnProperty.call(d, key)) {
                const stateId = key;
                const state = d[key];
                processStateChange(d.id, stateId, state);
            }
        }
    }
    assignClickEvents();
}

function getCard(device) {
    let html = '';
    html += `<div id="${device.id}" class="device-card">`;
    html += `   <div style="display:flex;justify-content: center;margin-top: 10px;">`;
    html += `       <span id="${device.id}-device-name" style="font-size: 14px;">${device.name}</span>`;
    html += `       <span id="${device.id}-edit" class="material-symbols-outlined edit-btn">edit</span>`;
    html += `   </div>`;
    html += `   <div class="lcd-display">`;
    html += '       <div style="margin-left: 4px;padding-top: 5px;">';
    html += `           <span id="${device.id}-hvac-mode" class="material-symbols-outlined" style="font-size: 20px;">mode_cool</span>`;
    html += '       </div>';
    html += '       <div style="margin-left: 7px;">';
    html += '           <div style="display: flex;">';
    html += '               <span class="">FAN</span>';
    html += `               <span id="${device.id}-fan-mode" class="" style="margin-left: 5px;">AUTO</span>`;
    html += '           </div>';
    html += '           <div style="display: flex;height: 15px;">';
    html += `               <span id="${device.id}-fan-speed" class="material-symbols-outlined" style="font-size: 20px;">signal_cellular_alt</span>`;
    html += '           </div>';
    html += '           <div style="display: flex;justify-content: center;align-items: center;">';
    html += `               <span id="${device.id}-target-temperature" style="margin-left: 10px;" class="temperature">${device['target-temperature']}</span>`;
    html += `               <span class="degree">°C</span>`;
    html += '           </div>';
    html += '       </div>';
    html += `   </div>`;
    html += '   <div style="display:flex;justify-content: space-between;margin-bottom: 20px;margin-left: 15px;margin-right: 15px;">';
    html += `           <a id="${device.id}-on-off-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">power_settings_new</span></a>`;
    html += `           <a id="${device.id}-display-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">wb_incandescent</span></a>`;
    html += '   </div>';
    html += '   <div style="display:flex;justify-content: center;margin-bottom: 40px;">';
    html += '       <div style="display: flex;flex-direction: column;gap: 55px;">';
    html += `           <a id="${device.id}-temperature-up-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">expand_less</span></a>`;
    html += `           <a id="${device.id}-temperature-down-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">expand_more</span></a>`;
    html += `       </div>`;
    html += '       <div style="display: flex;flex-direction: column;">';
    html += `           <a id="${device.id}-mode-btn" class="oval-btn ctrl-btn" href="#"><span>Mode</span></a>`;
    html += `           <a id="${device.id}-fan-btn" class="oval-btn ctrl-btn" href="#"><span>Fan</span></a>`;
    html += `           <a id="${device.id}-turbo-btn" class="oval-btn ctrl-btn" href="#"><span>Turbo</span></a>`;
    html += '       </div>';
    html += '   </div>';
    html += '</div>';
    return html;
}

function assignClickEvents() {
    $('.ctrl-btn').click(function () {
        const btn = this.id;
        const parts = btn.split('-');
        const command = parts.slice(1).join('-');
        console.log('clicked: ' + btn);
        const deviceId = $(this).parents('.device-card').attr('id');
        // console.log('deviceId: ' + deviceId);
        // console.log('command: ' + command);
        sendTo(namespace, 'sendCommand', { deviceId: deviceId, command: command }, function (data) {
            if (data) {
                if (data.error) {
                    console.log('Error: ' + data.error);
                } else {
                    console.log('msg: ' + data);
                }
            }
        });
    });
    $('.edit-btn').click(function () {
        const deviceId = $(this).parents('.device-card').attr('id');
        const deviceName = $(`#${deviceId}-device-name`).text();
        // console.log('deviceId: ' + deviceId);
        // console.log('deviceName: ' + deviceName);
        $('#modaledit').find('input[id=\'d_name\']').val(deviceName);
        $('#modaledit a.btn[name=\'save\']').unbind('click');
        $('#modaledit a.btn[name=\'save\']').click(() => {
            const newName = $('#modaledit').find('input[id=\'d_name\']').val();
            console.log('newName: ' + newName);
            sendTo(namespace, 'renameDevice', { deviceId: deviceId, name: newName }, function (data) {
                if (data) {
                    if (data.error) {
                        console.log('Error: ' + data.error);
                    } else {
                        // console.log('msg: ' + JSON.stringify(data));
                        $(`#${deviceId}-device-name`).text(newName);
                    }
                }
            });
        });

        $('#modaledit').modal();
        $('#modaledit').modal('open');
        $('#modaledit').find('input[id=\'d_name\']').focus();

        Materialize.updateTextFields();
    });
}

// Read language settings
function loadSystemConfig(callback) {
    socket.emit('getObject', 'system.config', function (err, res) {
        if (!err && res && res.common) {
            // @ts-ignore
            systemLang = res.common.language || systemLang; // eslint-disable-line no-global-assign
            // @ts-ignore
            systemConfig = res;
        }
        if (callback) callback();
    });
}

function sendTo(_adapter_instance, command, message, callback) {
    socket.emit('sendTo', _adapter_instance, command, message, callback);
}