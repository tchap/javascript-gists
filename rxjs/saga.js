'use strict';

/*
 * OUTPUT:
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
 */

const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

const storySaga = source => {
  const sink = new Rx.Subject();

  source.forEach(action => {
    sink.onNext({
      type: action.type + '.Processed'
    });
  });

  return sink;
}

const storiesSaga = actions$ => {
  // Output subject for this saga.
  const sink = new Rx.Subject();

  // Subjects associated with the stories in the list.
  let subjects = [];

  // Handle 'Fetched'
  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const stories = action.payload;

      // Clean up the old story subjects.
      subjects.forEach(subject => subject.dispose());

      // Create new story subjects, connect their sinks to the saga output subject.
      subjects = stories.map((story, i) => {
        const input = new Rx.Subject();
        const output = storySaga(input);

        // This is where the wrapping is happening.
        output.forEach(action => sink.onNext({
          type: `[${i}].${action.type}`,
          payload: action.payload
        }));

        return input;
      });

      // Dispatch story-specific 'Fetched'.
      stories.forEach((story, i) => {
        subjects[i].onNext({
          type: 'Fetched',
          payload: story
        });
      });
    });

  // Handle '[].EditRequested'
  const editRe = /\[([0-9]+)\][.]EditRequested/;

  actions$
    .filter(action => action.type.match(editRe))
    .forEach(action => {
      // Get the index of the story to be edited.
      const index = parseInt(editRe.exec(action.type)[1], 10);

      // Go through the list of stories,
      // dispatch 'EditRequested' for the selected story,
      // dispatch 'EditCancelled' for all other stories.
      subjects.forEach((subject, i) => {
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

  // Return the saga output.
  return sink;
};

var actions$ = Rx.Observable.merge(
  // Fetch some stories from the API.
  Rx.Observable.timer(100)
    .map(() => ({
      type: 'Fetched',
      payload: [
        {id: 0},
        {id: 1},
        {id: 2}
      ]
    })),
  // Mimic a push notification that a story has been changed.
  // Mimic a push notification that a story has been added.

  // Request story edit periodically.
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
