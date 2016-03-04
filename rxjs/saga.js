const Rx = require('rx');

const logOutput = observable => observable.forEach(
  (x)   => console.log('Next: ' + JSON.stringify(x)),
  (err) => console.log('Error: ' + err),
  ()    => console.log('Completed')
);

/*
const storyEditSaga = (actions$, id) => Rx.Observable.merge(
  actions$
    .filter({ action, payload } => action.type === 'EditRequested')
    .do({ payload } => console.log('EDIT START', payload.story.id)),
  actions$
    .filter({ action } => action.type === 'EditCancelled')
    .do({ payload } => console.log('EDIT STOP', payload.story.id))
);
*/

const storiesSaga = actions$ => {
  // This is basically a router that needs to understand how storySaga works
  // so that it can forward actions properly.
  
  subjects = [];

  const editRe = /\[([0-9]+)\][.]Edit/;

  // Handle story fetching.
  actions$
    .filter(action => action.type === 'Fetched')
    .forEach(action => {
      const stories = action.payload.stories;

      // Get rid of the old subjects.
      subjects.forEach(subject => subject.dispose());

      // Create new subjects.
      subjects = stories.map(() => storySaga(new Rx.Subject()));

      // Send 'Inserted' all at once.
      stories.forEach((story, i) => subjects[i].onNext({
        type: 'Inserted',
        payload: story
      }));
    });

  // Handle the edit event.
  return actions$
    .filter(action => action.type.match(editRe))
    .forEach(action => {
      const index = parseInt(editRe.exec(action.type), 10);
      subjects.forEach((subject, i) => {
        if (i === index) {
          subject.onNext({type: 'Edit'});
        } else {
          subject.onNext({type: 'EditCancelled'});
        }
      });
    });
};

var actions$ = Rx.Observable.timer(0, 1000)
  .timeInterval()
  .map(x => ({
    type: `[${x.value % 3}].Edit`,
  }));


logOutput(storiesSaga(actions$));
