'use strict';

/*
 * EXPECTED OUTPUT:
 *
 * $ node saga.js 
 * Next: {"type":"[0].Inserted.Processed"}
 * Next: {"type":"[1].Inserted.Processed"}
 * Next: {"type":"[2].Inserted.Processed"}
 * Next: {"type":"[0].EditRequested.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditRequested.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditRequested.Processed"}
 * Next: {"type":"[0].EditRequested.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditRequested.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditRequested.Processed"}
 * ...
 * (CTRL+C)
 *
 * CURRENT OUTPUT:
 *
 * $ node saga.js 
 * Next: {"type":"[0].EditRequested.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditRequested.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditRequested.Processed"}
 * Next: {"type":"[0].EditRequested.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditRequested.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditRequested.Processed"}
 * ...
 * (CTRL+C)
 */

const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

const storySaga = inputSB => {
  const outputSB = new Rx.Subject();

  inputSB.forEach(action => {
    outputSB.onNext({
      type: action.type + '.Processed'
    });
  });

  return outputSB;
}

const storiesSaga = actions$ => {
  // This is basically a router that needs to understand how storySaga works
  // so that it can forward actions properly.
  
  const outputSB = new Rx.Subject();

  let storySubjects = [];

  // Handle 'Fetched'
  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const stories = action.payload;

      // Get rid of the old subjects.
      storySubjects.forEach(subject => subject.dispose());

      // Create new subjects and merge into output$.
      storySubjects = stories.map((story, i) => {
        const input = new Rx.Subject();
        const output = storySaga(input);

        output.forEach(action => outputSB.onNext({
          type: `[${i}].${action.type}`,
          payload: action.payload
        }));

        return input;
      });

      // Send 'Inserted' all at once.
      stories.forEach((story, i) => {
        storySubjects[i].onNext({
          type: 'Inserted',
          payload: story
        });
      });
    });

  // Handle '[].EditRequested'
  const editRe = /\[([0-9]+)\][.]EditRequested/;

  actions$
    .filter(action => action.type.match(editRe))
    .forEach(action => {
      const index = parseInt(editRe.exec(action.type)[1], 10);
      storySubjects.forEach((subject, i) => {
        if (i === index) {
          subject.onNext({
            type: 'EditRequested',
            payload: action.payload
          });
        } else {
          subject.onNext({
            type: 'EditCancelled',
            payload: action.payload
          });
        }
      });
    });

  // Merge the streams.
  return outputSB;
};

var actions$ = Rx.Observable.merge(
  Rx.Observable.of({
    type: 'Fetched',
    payload: [
      {id: 0},
      {id: 1},
      {id: 2}
    ]
  }),
  Rx.Observable.interval(500)
    .timeInterval()
    .map(x => {
      const id = x.value % 3;

      return {
        type: `[${id}].EditRequested`,
        payload: {id: id}
      };
    })
);

logOutput(storiesSaga(actions$));
