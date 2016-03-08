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

const Rx        = require('rx');
const SagaUtils = require('./sagaUtils');

/*
 * Comments
 */

const commentSaga = source => {
  const sink = new Rx.Subject();
  source.forEach(action => sink.onNext({type: action.type + '.Processed'}));
  return sink;
};

const commentsSaga = actions$ => {
  // Instantiate a router.
  const composer = new SagaUtils.ListComposer(commentSaga);

  /*
   * Handle 'Fetched'
   */

  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const comments = action.payload;

      // Replace old comments.
      composer.setElements(comments);

      // Dispatch comment-specific 'Fetched'.
      composer.elements.forEach((comment, i) =>
        composer.dispatchTo(i, {
          type: 'Fetched',
          payload: comment
        })
      );
    });

  /*
   * Handle 'Edited'
   */

  actions$
    .filter(action => action.type === 'Edited')
    .forEach(action => {
      const id = action.payload.id;
      composer.dispatchTo(element => element.id === id, action);
    });

  /*
   * Handle 'Created'
   */

  actions$
    .filter(action => action.type === 'Created')
    .forEach(action => {
      // Register the comment with the composer.
      composer.pushElement(action.payload);

      // Dispatch comment-specific 'Fetched'.
      composer.dispatchTo(element => element.id === id, {
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
      composer.elements.forEach((element, i) => {
        if (i === index) {
          composer.dispatchTo(i, {
            type: 'EditRequested',
            payload: action.payload
          });
        } else {
          composer.dispatchTo(i, {
            type: 'EditCancelled',
            payload: action.payload
          });
        }
      });
    });

  // Return the output.
  return composer.sink;
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
        {id: 2},
        {id: 3, parentId: 2}
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
