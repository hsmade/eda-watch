import React, { Component } from 'react';
import { openDatabase } from 'react-native-sqlite-storage';

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
                    console.log('Results: ',tx, results);
                }
            );
        });

    }

    initDB() {
        console.log("INIT DB", this.state.name)
        this.executeQuery(this.state.schema, [])
    }

    componentWillMount(): void {
        this.state.db = openDatabase({name: this.state.name});
        this.initDB()
    }

    componentWillReceiveProps(nextProps: Readonly<P>, nextContext: any): void {
        console.log("UPDATE DB", this.state.name, nextProps)
        this.executeQuery(this.state.insertQuery, [nextProps.datetime, nextProps.data])
    }

    render() {
        return null
    }
}
