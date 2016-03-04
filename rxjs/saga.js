const Rx = require('rx');

var actions$ = Rx.Observable.timer(0, 1000)
  .timeInterval()

actions$.subscribe(
  (x) => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  () => console.log('Completed')
);
