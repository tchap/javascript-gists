'use strict';


const Rx = require('rx');
const _  = require('lodash');


class ListComposer {

  constructor(saga) {
    this._saga = saga;
    this._sink = new Rx.Subject();
    this._sources = [];
    this._elements = [];
  }

  get sink() {
    return this._sink;
  }

  get elements() {
    return this._elements.slice(0);
  }

  setElements(elements) {
    this._sources.forEach(source => source.dispose());
    this._sources = elements.map((_, i) => this._newSource(i));
    this._elements = elements.slice(0);
  }

  pushElement(element) {
    this._sources.push(this._newSource(this._sources.length));
    this._elements.push(element);
  }

  dispatch(action) {
    const pattern = /^\[([0-9]+)\][.](.+)$/;
    const match = pattern.exec(action.type);
    const index = match[1];
    const type = match[2];

    this._sources[index].onNext({
      type: type,
      payload: action.payload
    });
  }

  dispatchTo(selector, action) {
    if (_.isInteger(selector)) {
      this._sources[selector].onNext(action);
      return;
    }

    if (_.isFunction(selector)) {
      this._elements.forEach((value, index, array) => {
        if (selector(value, index, array)) {
          this._sources[index].onNext(action);
        }
      });
      return;
    }

    throw new Error(`unknown selector type: ${typeof selector}`);
  }

  _newSource(index) {
    const source = new Rx.Subject();
    const sink = this._saga(source);

    // This is where the wrapping is happening.
    sink.forEach(action => this._sink.onNext({
      type: `[${index}].${action.type}`,
      payload: action.payload
    }));

    return source; 
  }
}

exports.ListComposer = ListComposer;
