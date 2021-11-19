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
                    saveFeatured(snapshot);
                } else {
                    admin.firestore()
                        .collection('nades')
                        .where(admin.firestore.FieldPath.documentId(), "<", key)
                        .limit(1)
                        .get()
                        .then(snapshot => {
                            saveFeatured(snapshot);
                        })
                }
            })
        return null;
      });

function saveFeatured(snapshot) {

    snapshot.forEach(doc => {
        console.log(doc.id, "=>", doc.data().name);

        const nadeReference = admin.firestore().collection('nades').doc(doc.id);

        admin.firestore()
            .collection('featured')
            .doc('nade')
            .set({
                'reference': nadeReference
            })

        console.log("map: ", doc.data().map.toLowerCase());
                
        admin.firestore()
            .collection('maps')
            .where('name', '==', doc.data().map)
            .limit(1)
            .get()
            .then(mapSnapshot => {
                mapSnapshot.forEach(mapDoc => {
                    const mapReference = admin.firestore().collection('maps').doc(mapDoc.id);

                    admin.firestore()
                        .collection('featured')
                        .doc('map')
                        .set({
                            'reference': mapReference
                        })
                });
            })
    });
}

// Daily function to send a push notification
// to subscribed users with the Featured nade
exports.featuredNotification = functions.pubsub.schedule('0 8 * * *')
    .timeZone('Europe/London')
    .onRun((context) => {
        admin.firestore()
            .collection('featured')
            .doc('nade')
            .get()
            .then(snapshot => {
                snapshot.data().reference
                    .get()
                    .then(doc => {
                        sendFeaturedNotification(doc.data().id, doc.data().name, doc.data().map, doc.data().thumbnail);
                    })
            })
        return null;
    });

function sendFeaturedNotification(id, nade, map, thumbnail) {

    const topic = "popflashFeatured";
    const payload = {
        notification: {
          title: 'Popflash',
          body: `Featured: ${map}, ${nade}.`,
          sound: 'default',
          image: `${thumbnail}`
        },
        data: {
            "link": `popflash://featured/nade?id=${id}`
        }
      };

    admin.messaging().sendToTopic(topic, payload);

}

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
