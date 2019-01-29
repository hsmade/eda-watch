import {VictoryTheme, VictoryChart, VictoryAxis, VictoryArea, VictoryGroup} from 'victory-native';
import React from "react";
import { Dimensions } from "react-native";

export class Chart extends React.Component {

    render() {
        const screenWidth = Dimensions.get('window').width;
        const xOffsets = [50,  screenWidth-50];
        const tickPadding = [ 0, -15 ];
        const anchors = ["end", "start"];
        const colors = ["magenta", "cyan"];
        const data = this.props.data;
        const maxima = data.map(
            (dataset) => Math.max(...dataset.map((d) => d.y)) || 1
        );
        let height = Dimensions.get('window').height - 50;
        if (height >( screenWidth / 3) * 2) { height = (screenWidth / 3) * 2 }

        return (
                <VictoryChart
                    theme={VictoryTheme.material}
                    width={screenWidth}
                    height={height}
                    // domain={{ y: [0, 1] }}
                    scale={{ x: "time" }}
                >
                    <VictoryAxis style={{
                        grid: {stroke: (t) => ""},
                        tickLabels: { fill: '#ECEFF1' },
                    }}/>
                    {data.map((d, i) => (
                        <VictoryAxis dependentAxis
                                     key={i}
                                     offsetX={xOffsets[i]}
                                     style={{
                                         grid: { stroke: (t) => "" },
                                         axis: { stroke: colors[i] },
                                         ticks: { padding: tickPadding[i] },
                                         tickLabels: { fill: colors[i], textAnchor: anchors[i] },
                                     }}
                            // Use normalized tickValues (0 - 1)
                                     tickValues={[0.25, 0.5, 0.75, 1]}
                            // Re-scale ticks by multiplying by correct maxima
                                     tickFormat={(t) => t * maxima[i]}
                        />
                    ))}
                    {data.map((d, i) => (
                        <VictoryArea
                            key={i}
                            data={d}
                            style={{
                                data: { fill: colors[i], stroke: colors[i], strokeWidth: 3, fillOpacity: 0.4 }
                            }}
                            // normalize data
                            y={(datum) => datum.y / maxima[i]}
                        />
                    ))}
                </VictoryChart>
        );
    }
}
