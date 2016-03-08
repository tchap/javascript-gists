'use strict';


const Rx = require('rx');
const _  = require('lodash');


class ListComposer() {

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
    this._sources.forEach(subject => subject.dispose());
    this._sources = elements.map((_, i) => ::this.newSource(i));
    this._elements = elements.slice(0);
  }

  pushElement(element) {
    this._sources.push(this.newSource(this._sources.length));
    this._elements.push(element);
  }

  dispatchTo(selector, action, elseAction) {
    if (_.isInteger(selector)) {
      selector = (_, index) => index === selector;
    }

    if (_.isFunction(selector)) {
      this._elements.forEach((value, index, array) => {
        if (selector(value, index, array)) {
          this._sources[index].onNext(action);
        } else if (elseAction) {
          this._sources[index].onNext(elseAction);
        }
      });
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
