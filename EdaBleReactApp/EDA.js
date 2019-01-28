import React from 'react';
import {decode as atob} from 'base-64'
import {StoreComponent, ReadComponent} from "./Database";
import {LiveView} from "./LiveView";

export class EdaComponent extends LiveView {
    constructor() {
        super();
        this.name = "EDA";
    }

    convert (data) {
        return base64ToInt16(atob(data))
    }
}

export class Store extends StoreComponent {
    constructor() {
        super();
        this.state.name = 'EDA';
        this.state.schema = "CREATE TABLE IF NOT EXISTS EDA (datetime INTEGER PRIMARY KEY, eda VARCHAR(20))";
        this.state.insertQuery = "INSERT INTO EDA VALUES(?1, ?2)"
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
        return base64ToInt16(atob(data))
    }
}

function base64ToInt16(raw) {
    let result = raw.charCodeAt(0) << 8;
    result += raw.charCodeAt(1);
    return result
}
