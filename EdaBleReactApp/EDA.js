import React, { Component } from 'react';
import {Text, View} from "react-native";
import {LineChart, Grid, XAxis} from 'react-native-svg-charts'
import dateFns from 'date-fns'
import {decode as atob} from 'base-64'
import {StoreComponent} from "./Database";

export class EdaComponent extends Component {
    constructor() {
        super()
        this.state = {
            dataPoints: [{date: new Date(), value: 0},],
        }
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
        if (nextProps.data) {
            this.setState({dataPoints: [...this.state.dataPoints, {date: new Date(), value: base64ToInt16(atob(nextProps.data))}]})
            if (this.state.dataPoints.length > 60) {
                this.setState({ dataPoints: this.state.dataPoints.slice(1) })
                // console.log(this.state, this.state.dataPoints.length)
            }
        }
    }

    toText() {
        // console.log("EdaComponent.toText():", this.props.data)
        if (this.props.data === undefined) return "EDA: -"
        const data = base64ToInt16(atob(this.props.data))
        return "EDA: " + data.toString()
    }

    render() {
        return (
            <View style={{ height: 200, padding: 20 }}>
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
        this.state.name = 'EDA'
        this.state.schema = "CREATE TABLE IF NOT EXISTS EDA (datetime INTEGER PRIMARY KEY, eda VARCHAR(20))"
        this.state.insertQuery = "INSERT INTO EDA VALUES(?1, ?2)"
        console.log("constructor:", this.state)
    }
}

function base64ToInt16(raw) {
    let result = raw.charCodeAt(0) << 8
    result += raw.charCodeAt(1)
    return result
}
