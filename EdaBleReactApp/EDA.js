import React from 'react';
import {decode as atob} from 'base-64'


/**
 * @return {number}
 */
export function ConvertData(data) {
    return base64ToInt16(atob(data))
}

function base64ToInt16(raw) {
    let result = raw.charCodeAt(0) << 8;
    result += raw.charCodeAt(1);
    return result
}
