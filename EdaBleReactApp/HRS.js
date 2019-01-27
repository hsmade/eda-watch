import React, { Component } from 'react';
import {Buffer} from "buffer";
import {Text, View} from "react-native";
import {LineChart, Grid, XAxis} from 'react-native-svg-charts'
import dateFns from 'date-fns'
import {StoreComponent} from "./Database";

export class HrsComponent extends Component {
    constructor() {
        super()
        this.state = {
            dataPoints: [{date: new Date(), value: 0},],
        }
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
        if (nextProps.data) {
            this.setState({dataPoints: [...this.state.dataPoints, {date: new Date(), value: parseHeartRateData(Buffer.from(nextProps.data)).bpm}]})
            if (this.state.dataPoints.length > 60) {
                this.setState({ dataPoints: this.state.dataPoints.slice(1) })
                // console.log(this.state, this.state.dataPoints.length)
            }
        }
    }

    toText() {
        // console.log("HrsComponent.toText():", this.props.data)
        if (this.props.data === undefined) return "Heart rate: -"
        const data = parseHeartRateData(Buffer.from(this.props.data))
        return "Heart rate: bpm=" + data.bpm.toString() + " sensor=" + data.sensor
    }

    render() {
        return (
            <View>
                {/*<Text>{this.toText()}</Text>*/}
                <LineChart
                    style={{ height: 200 }}
                    data={ this.state.dataPoints }
                    svg={{ stroke: 'rgb(134, 65, 244)' }}
                    contentInset={{ top: 0, bottom: 0 }}
                    yAccessor={ ({ item }) => item.value }
                    xAccessor={ ({ item }) => item.date }
                >
                    <Grid/>
                </LineChart>
                <XAxis
                    data={ this.state.dataPoints }
                    svg={{
                        fill: 'black',
                        fontSize: 8,
                        fontWeight: 'bold',
                        rotation: 90,
                        originY: 30,
                        y: 5,
                    }}
                    xAccessor={ ({ item }) => item.date }
                    numberOfTicks={ 6 }
                    style={{ marginHorizontal: -15, height: 100 }}
                    contentInset={{ left: 10, right: 25 }}
                    formatLabel={ (value) => dateFns.format(value, 'HH:mm:ss') }
                />
            </View>
        )
    }
}


export class Store extends StoreComponent {
    constructor() {
        super();
        this.state.name = 'HRS'
        this.state.schema = "CREATE TABLE IF NOT EXISTS HRS (datetime INTEGER PRIMARY KEY, bpm VARCHAR(20))"
        this.state.insertQuery = "INSERT INTO HRS VALUES(?1, ?2)"
        console.log("constructor:", this.state)
    }
}

function parseHeartRateData(data) {
    let cursor = 0
    function readNext(byteLength) {
        const value = (byteLength > 0) ? data.readUIntLE(cursor, byteLength) : undefined
        cursor += byteLength
        return value
    }
    // the first byte of data is the mandatory "Flags" value,
    // which indicates how to read the rest of the data buffer.
    const flags = readNext(1)
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
    const valueFormat =          (flags >> 0) & 0b01
    const sensorContactStatus =  (flags >> 1) & 0b11
    const energyExpendedStatus = (flags >> 3) & 0b01
    const rrIntervalStatus =     (flags >> 4) & 0b01

    const bpm = readNext(valueFormat === 0 ? 1 : 2)
    const sensor = (sensorContactStatus === 2) ? 'no contact' : ((sensorContactStatus === 3) ? 'contact' : 'N/A')
    const energyExpended = readNext(energyExpendedStatus === 1 ? 2 : 0)
    const rrSample = readNext(rrIntervalStatus === 1 ? 2 : 0)
    // RR-Interval is provided with "Resolution of 1/1024 second"
    const rr = rrSample && (rrSample * sampleCorrection) | 0
    return {bpm, sensor, energyExpended, rr}
    // return "bpm: " + bpm.toString() + " sensor: " + sensor.toString()
}
