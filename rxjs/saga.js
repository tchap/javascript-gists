'use strict';

const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

const storySaga = subject => {
  subject.forEach(action => console.log(`${action.type} ${action.payload.id}`));
  return subject;
}

const storiesSaga = actions$ => {
  // This is basically a router that needs to understand how storySaga works
  // so that it can forward actions properly.
  
  const output$ = new Rx.Subject();

  let storySubjects = [];

  // Handle 'Fetched'
  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const stories = action.payload;

      // Get rid of the old subjects.
      storySubjects.forEach(subject => subject.dispose());

      // Create new subjects.
      storySubjects = stories.map(() => storySaga(new Rx.Subject()))

      // Send 'Inserted' all at once.
      stories.forEach((story, i) => storySubjects[i].onNext({
        type: 'Inserted',
        payload: story
      }));
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
  return output$;
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
