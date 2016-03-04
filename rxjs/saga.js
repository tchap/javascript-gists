const Rx = require('rx');

var actions$ = Rx.Observable.timer(0, 1000)
  .timeInterval()
  .map(x => ({
    action: `Stories[${x.value % 3}].Edit`,
  }));

actions$.subscribe(
  (x) => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  () => console.log('Completed')
);
