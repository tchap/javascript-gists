const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

var actions$ = Rx.Observable.timer(0, 1000)
  .timeInterval()
  .map(x => ({
    action: `Stories[${x.value % 3}].Edit`,
  }));

logOutput(actions$);
