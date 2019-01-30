import React, { Component } from 'react';
import { openDatabase } from 'react-native-sqlite-storage';
import {View} from "react-native";
import {Grid, LineChart, XAxis} from "react-native-svg-charts";
import dateFns from 'date-fns'

export class StoreComponent extends Component {
    constructor() {
        super();
        this.state = {
            db: null,
            name: "table_name",
            schema: "CREATE TABLE IF NOT EXISTS  NotSet (id INTEGER PRIMARY KEY AUTOINCREMENT, value VARCHAR(20))",
            insertQuery: "INSERT INTO NotSet values(?1, ?2)",
        };
    }

    executeQuery(query, params) {
        this.state.db.transaction((tx)=> {
            tx.executeSql(
                query,
                params,
                (tx, results) => {
                    // console.log('Results: ',tx, results);
                }
            );
        });

    }

    initDB() {
        // console.log("INIT DB", this.state.name);
        this.executeQuery(this.state.schema, [])
    }

    componentWillMount(): void {
        this.state.db = openDatabase({name: this.state.name});
        this.initDB()
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
        // console.log("UPDATE DB", this.state.name, nextProps);
        this.executeQuery(this.state.insertQuery, [nextProps.datetime, nextProps.data])
    }

    render() {
        return null
    }
}

export class ReadComponent extends Component {
    constructor() {
        super();
        this.state = {
            db: null,
            name: "table_name",
            schema: "CREATE TABLE IF NOT EXISTS  NotSet (id INTEGER PRIMARY KEY AUTOINCREMENT, value VARCHAR(20))",
            readQuery: "SELECT * FROM " + this.state.name + " WHERE datetime >= ? AND datetime <= ?",
        };
    }

    executeQuery(query, params) {
        this.state.db.transaction((tx)=> {
            tx.executeSql(
                query,
                params,
                (tx, results) => {
                    // console.log('Results: ',tx, results);
                }
            );
        });

    }

    initDB() {
        // console.log("INIT DB", this.state.name);
        this.executeQuery(this.state.schema, [])
    }

    componentWillMount(): void {
        this.state.db = openDatabase({name: this.state.name});
        this.initDB()
    }


    getData(start, end): Array {
        let data = [];
        this.executeQuery(this.state.readQuery, [start, end], function(rs) {
            data = rs.rows;
        });
        this.setState({data: data})
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
       this.getData(nextProps.start, nextProps.end)
    }

    convertData(data) {
        return data
    }

    render() {
        return (
            <View style={{ height: 200, padding: 20 }}>
                <LineChart
                    style={{ height: 200 }}
                    data={ this.state.data }
                    svg={{ stroke: 'rgb(134, 65, 244)' }}
                    contentInset={{ top: 0, bottom: 0 }}
                    yAccessor={ ({ item }) => this.convertData(item.value) }
                    xAccessor={ ({ item }) => item.date }
                >
                    <Grid/>
                </LineChart>
                <XAxis
                    data={ this.state.data }
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
