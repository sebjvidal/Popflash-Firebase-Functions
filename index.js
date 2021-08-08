const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Daily function to generated Featured nade, selects a 
// random document in /nades/ and save to /featured/ 
admin.initializeApp(functions.config().firebase);
exports.scheduledFunction = functions.pubsub.schedule('0 0 * * *')
    .timeZone('Europe/London')
    .onRun((context) => {
        const key = admin.firestore().collection('nades').doc().id;

        admin.firestore()
            .collection('nades')
            .where(admin.firestore.FieldPath.documentId(), '>=', key)
            .limit(1)
            .get()
            .then(snapshot => {
                if(snapshot.size > 0) {
                    snapshot.forEach(doc => {
                        console.log(doc.id, "=>", doc.data().name);

                        admin.firestore()
                                .collection('featured')
                                .doc('nade')
                                .set(doc.data())

                        console.log("map: ", doc.data().map.toLowerCase());
                        
                        admin.firestore()
                            .collection('maps')
                            .where('name', '==', doc.data().map)
                            .limit(1)
                            .get()
                            .then(snapshot => {
                                snapshot.forEach(doc => {
                                    admin.firestore()
                                        .collection('featured')
                                        .doc('map')
                                        .set(doc.data())
                                });
                            })
                    });
                } else {
                    admin.firestore()
                        .collection('nades')
                        .where(admin.firestore.FieldPath.documentId(), "<", key)
                        .limit(1)
                        .get()
                        .then(snapshot => {
                            snapshot.forEach(doc => {
                                console.log(doc.id, "=>", doc.data().name);

                                admin.firestore()
                                    .collection('featured')
                                    .doc('nade')
                                    .set(doc.data())

                                console.log("map: ", doc.data().map.toLowerCase());

                                admin.firestore()
                                    .collection('maps')
                                    .where('name', '==', doc.data().map)
                                    .limit(1)
                                    .get()
                                    .then(snapshot => {
                                        snapshot.forEach(doc => {
                                            admin.firestore()
                                                .collection('featured')
                                                .doc('map')
                                                .set(doc.data())
                                        });
                                    })
                            });
                        })
                }
            })

        return null;
      });

exports.updateMapLatestDoc = functions.firestore.document('nades/{wildcard}')
    .onCreate((snapshot, context) => {
        const date = new Date()

        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();

        const formattedDate = dd + '-' + mm + '-' + yyyy;
        
        const nadeData = snapshot.data();

        console.log(formattedDate);
        console.log(nadeData);

        admin.firestore()
            .collection('maps')
            .where('name', '==', snapshot.data().map)
            .limit(1)
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    console.log(doc.data());
                    console.log('doc id: ' + doc.id);

                    admin.firestore()
                        .collection('maps')
                        .doc(doc.id)
                        .set({lastAdded: formattedDate}, {merge: true})
                });
            })

        return null;
    });

exports.createUserFavourites = functions.firestore.document('users/{uid}')
    .onCreate((userSnapshot, context) => {
        admin.firestore()
            .collection('maps')
            .get()
            .then(mapSnapshot => {
                mapSnapshot.forEach(doc => {
                    admin.firestore()
                        .collection('users')
                        .doc(context.params.uid)
                        .collection('maps')
                        .doc(doc.id)
                        .set(Object.assign({}, doc.data(), {favourite: false, position: 0}))
                });
            })

        return null;

    });