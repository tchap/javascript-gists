const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

const storyEditSaga = actions$ => actions$
  .forEach(action => console.log(`${action.type} ${action.payload.story.id}`));

const storiesSaga = actions$ => {
  // This is basically a router that needs to understand how storySaga works
  // so that it can forward actions properly.
  
  const output$ = new Rx.Subject();

  let storySubjects = [];

  // Handle 'Fetched'
  const fetch$ = actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const stories = action.payload.stories;

      // Get rid of the old subjects.
      storySubjects.forEach(subject => subject.dispose());

      // Create new subjects.
      storySubjects = stories.map(() => storySaga(new Rx.Subject()));

      // Send 'Inserted' all at once.
      stories.forEach((story, i) => storySubjects[i].onNext({
        type: 'Inserted',
        payload: story
      }));
    });

  // Handle '[].EditRequested'
  const editRe = /\[([0-9]+)\][.]EditRequested/;

  const edit$ = actions$
    .filter(action => action.type.match(editRe))
    .forEach(action => {
      const index = parseInt(editRe.exec(action.type), 10);
      storySubjects.forEach((subject, i) => {
        if (i === index) {
          subject.onNext({type: 'EditRequested'});
        } else {
          subject.onNext({type: 'EditCancelled'});
        }
      });
    });

  // Merge the streams.
  return Rx.Observable.merge(
    actions$,
    fetch$,
    edit$
  );
};

var actions$ = Rx.Observable.merge(
  Rx.Observable.of({
    type: 'Fetched',
    payload: [
      {id: 123},
      {id: 234},
      {id: 345}
    ]
  }),
  Rx.Observable.interval(500)
    .timeInterval()
    .map(x => ({
      type: `[${x.value % 3}].Edit`,
    }))
);

logOutput(storiesSaga(actions$));
