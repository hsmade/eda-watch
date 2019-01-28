import React, { Component } from 'react';
import {Text, View} from "react-native";
import {LineChart, Grid, XAxis} from 'react-native-svg-charts'
import dateFns from 'date-fns'

export class LiveView extends Component {
    constructor() {
        super();
        this.name = "UNSET";
        this.state = {
            dataPoints: [{date: new Date(), value: 0},],
        }
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
        if (nextProps.data) {
            this.setState({dataPoints: [...this.state.dataPoints, {date: new Date(), value: this.convert(nextProps.data)}]});
            if (this.state.dataPoints.length > 60) {
                this.setState({ dataPoints: this.state.dataPoints.slice(1) })
            }
        }
    }

    convert (data) {
        return data
    }

    toText() {
        if (this.props.data === undefined) return this.name + ": -";
        const data = this.convert(this.props.data);
        return this.name + ": " + data.toString()
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
