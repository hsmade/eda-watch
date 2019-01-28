import React  from 'react';
import {Buffer} from "buffer";
import {ReadComponent, StoreComponent} from "./Database";
import {LiveView} from "./LiveView";

export class HrsComponent extends LiveView {
    constructor() {
        super();
        this.name = "HRS";
    }

    convert(data) {
        return parseHeartRateData(Buffer.from(data))
    }
}


export class Store extends StoreComponent {
    constructor() {
        super();
        this.state.name = 'HRS';
        this.state.schema = "CREATE TABLE IF NOT EXISTS HRS (datetime INTEGER PRIMARY KEY, bpm VARCHAR(20))";
        this.state.insertQuery = "INSERT INTO HRS VALUES(?1, ?2)";
        console.log("constructor:", this.state)
    }
}

export class Read extends ReadComponent {
    constructor() {
        super();
        this.state.name = 'EDA';
        this.state.schema = "CREATE TABLE IF NOT EXISTS EDA (datetime INTEGER PRIMARY KEY, eda VARCHAR(20))";
        this.state.readQuery = "SELECT * FROM EDA WHERE datetime >= ? AND datetime <= ?";
    }

    convertData(data) {
        return parseHeartRateData(Buffer.from(data))
    }
}

function parseHeartRateData(data) {
    let cursor = 0;
    function readNext(byteLength) {
        const value = (byteLength > 0) ? data.readUIntLE(cursor, byteLength) : undefined;
        cursor += byteLength;
        return value
    }
    // the first byte of data is the mandatory "Flags" value,
    // which indicates how to read the rest of the data buffer.
    const flags = readNext(1);
    // 0b00010110
    //          ^ 0 => Heart Rate Value Format is set to UINT8. Units: beats per minute (bpm)
    //            1 => Heart Rate Value Format is set to UINT16. Units: beats per minute (bpm)
    //        ^^ 00 or 01 => Sensor Contact feature is not supported in the current connection
    //           10       => Sensor Contact feature is supported, but contact is not detected
    //           11       => Sensor Contact feature is supported and contact is detected
    //       ^ 0 => Energy Expended field is not present
    //         1 => Energy Expended field is present (units are kilo Joules)
    //      ^ 0 => RR-Interval values are not present
    //        1 => One or more RR-Interval values are present
    //   ^^^ Reserved for future use
    const valueFormat =          (flags >> 0) & 0b01;
    const sensorContactStatus =  (flags >> 1) & 0b11;
    const energyExpendedStatus = (flags >> 3) & 0b01;
    const rrIntervalStatus =     (flags >> 4) & 0b01;

    const bpm = readNext(valueFormat === 0 ? 1 : 2);
    const sensor = (sensorContactStatus === 2) ? 'no contact' : ((sensorContactStatus === 3) ? 'contact' : 'N/A');
    const energyExpended = readNext(energyExpendedStatus === 1 ? 2 : 0);
    const rrSample = readNext(rrIntervalStatus === 1 ? 2 : 0);
    // RR-Interval is provided with "Resolution of 1/1024 second"
    const rr = rrSample && (rrSample * sampleCorrection) | 0;
    return {bpm, sensor, energyExpended, rr}
    // return "bpm: " + bpm.toString() + " sensor: " + sensor.toString()
}
