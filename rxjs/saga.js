'use strict';

/*
 * OUTPUT:
 *
 * $ node saga.js 
 * Next: {"type":"[0].Fetched.Processed"}
 * Next: {"type":"[1].Fetched.Processed"}
 * Next: {"type":"[2].Fetched.Processed"}
 * Next: {"type":"[1].Edited.Processed"}
 * Next: {"type":"[0].EditRequested.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[3].Fetched.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditRequested.Processed"}
 * Next: {"type":"[2].EditCancelled.Processed"}
 * Next: {"type":"[3].EditCancelled.Processed"}
 * Next: {"type":"[0].EditCancelled.Processed"}
 * Next: {"type":"[1].EditCancelled.Processed"}
 * Next: {"type":"[2].EditRequested.Processed"}
 * Next: {"type":"[3].EditCancelled.Processed"}
 * ...
 */

const Rx = require('rx');

/*
 * Comments
 */

const commentSaga = source => {
  const sink = new Rx.Subject();
  source.forEach(action => sink.onNext({type: action.type + '.Processed'}));
  return sink;
};

const commentsSaga = actions$ => {
  // Output subject for this saga.
  const sink = new Rx.Subject();

  // Subjects associated with the comments in the list.
  let subjects = [];

  /*
   * Handle 'Fetched'
   */

  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const comments = action.payload;

      // Clean up the old comment subjects.
      subjects.forEach(subject => subject.dispose());

      // Create new comment subjects, connect their sinks to the saga output subject.
      subjects = comments.map((comment, i) => {
        const input = new Rx.Subject();
        const output = commentSaga(input);

        // This is where the wrapping is happening.
        output.forEach(action => sink.onNext({
          type: `[${i}].${action.type}`,
          payload: action.payload
        }));

        return input;
      });

      // Dispatch comment-specific 'Fetched'.
      comments.forEach((comment, i) => {
        subjects[i].onNext({
          type: 'Fetched',
          payload: comment
        });
      });
    });

  /*
   * Handle 'Edited'
   */

  actions$
    .filter(action => action.type === 'Edited')
    .forEach(action => {
      // To keep things simple, the comment ID is the same as its local index.
      subjects[action.payload.id].onNext(action);
    });

  /*
   * Handle 'Created'
   */

  actions$
    .filter(action => action.type === 'Created')
    .forEach(action => {
      // To keep things simple, the comment ID is the same as its local index.
      // There is no 'Created' action for a comment, we send 'Fetched'.
      const id = action.payload.id;
      const input = new Rx.Subject();
      const output = commentSaga(input);

      // This is where the wrapping is happening.
      output.forEach(action => sink.onNext({
        type: `[${id}].${action.type}`,
        payload: action.payload
      }));

      subjects.push(input);

      input.onNext({
        type: 'Fetched',
        payload: action.payload
      });
    });

  /*
   * Handle '[].EditRequested'
   */

  const editRe = /\[([0-9]+)\][.]EditRequested/;

  actions$
    .filter(action => action.type.match(editRe))
    .forEach(action => {
      // Get the index of the comment to be edited.
      const index = parseInt(editRe.exec(action.type)[1], 10);

      // Go through the list of comments,
      // dispatch 'EditRequested' for the selected comment,
      // dispatch 'EditCancelled' for all other comments.
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

/*
 * Generate demo input actions$
 */

var actions$ = Rx.Observable.merge(
  // Fetch some comments from the API.
  Rx.Observable.timer(100)
    .map(() => ({
      type: 'Fetched',
      payload: [
        {id: 0},
        {id: 1},
        {id: 2}
      ]
    })),
  // Mimic a push notification that a comment has been edited.
  Rx.Observable.timer(200)
    .map(() => ({
      type: 'Edited',
      payload: {id: 1}
    })),
  // Request comment edit periodically.
  Rx.Observable.interval(500)
    .timeInterval()
    .map(x => {
      const id = x.value % 3;

      return {
        type: `[${id}].EditRequested`,
        payload: {id: id}
      };
    }),
  // Mimic a push notification that a comment has been added.
  Rx.Observable.timer(1000)
    .map(() => ({
      type: 'Created',
      payload: {id: 3}
    }))
);

/*
 * Print what is going out of the action stream.
 */

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

logOutput(commentsSaga(actions$));
