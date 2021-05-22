const butInstall = document.getElementById("butInstall");
const butSend = document.getElementById("butSend");
const applicationServerPublicKey = "BH208qyds5i_zT4s_SWLxNj4lW8ElpZAxW-svAL8cGtUQ5upVl44-3oEmk86Of39DBKy7GyPjgtwd99t0SpYips"


let isSubscribed = false;
let swRegistration = null;
var deferredPrompt;


const randomButton = document.getElementById("random")


const championImages = document.getElementById("champ_rotation").children

const selectChampWithIndex = (index) => {
    //remove borders
    for (let image of championImages) {
        image.classList.remove("selected")
    }

    //add border
    championImages[index]?.classList.add("selected")
}


let index = 0
randomButton.addEventListener("click", () => {

    const spinTime = 300

    let decrease_speed = 1


    function select_borders(index) {

        selectChampWithIndex(index)

        index = (index + 1) % championImages.length

        min = Math.ceil(0);
        max = Math.floor(20);

        //decrease speed randomly so it doesnt always select the same champ
        decrease_speed = decrease_speed + Math.floor(Math.random() * (max - min) + min)


        if (50 + decrease_speed >= spinTime) {
            setTimeout(() => selectChampWithIndex(index), 50 + decrease_speed)


            sendIndexToSW({ value: index })
            return
        } else {
            setTimeout(() => select_borders(index), 10 + decrease_speed)
        }
    }

    select_borders(index)

})

const sendIndexToSW = (data = { msg: "hello" }) => {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(data);
    } else {
        window.location.reload();
    }
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("got message", event.data.value)
        selectChampWithIndex(event.data.value)
    });
}

if ("serviceWorker" in navigator && "PushManager" in window) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
            listenForWaitingServiceWorker(reg, showUpdateButton);
            swRegistration = reg;
            initializeUI();
        }, ((err) => {
            console.log('ServiceWorker registration failed: ', err);
        }));
    });
} else {
    console.warn('Push messaging is not supported');
    butSend.textContent = 'Push Not Supported';
}

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();

    deferredPrompt = e;
    return false;
});


butInstall.addEventListener("click", () => {
    if (deferredPrompt !== undefined) {
        deferredPrompt.prompt();

        // Follow what the user has done with the prompt.
        deferredPrompt.userChoice.then(function (choiceResult) {
            if (choiceResult.outcome == "dismissed") {
                console.log("User cancelled home screen install");
            } else {
                console.log("User added to home screen");
            }

            // We no longer need the prompt.  Clear it up.
            deferredPrompt = null;
        });

    }
});



const listenForWaitingServiceWorker = (reg, callback) => {
    function awaitStateChange() {
        reg.installing.addEventListener("statechange", function () {
            if (this.state === "installed") callback(reg);
        });
    }
    if (!reg) return;
    if (reg.waiting) return callback(reg);
    if (reg.installing) awaitStateChange();
    reg.addEventListener("updatefound", awaitStateChange);
};

const showUpdateButton = (reg) => {
    if (reg) {
        let button = document.querySelector("#update");
        button.addEventListener("click", () => {
            reg.waiting.postMessage("skipWaiting");
        });
        button.style.display = "inline";
    }
};


let refreshing;
navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload(true);
});


function initializeUI() {
    console.log("initialize ui")
    butSend.addEventListener('click', function () {
        butSend.disabled = true;
        if (isSubscribed) {
            unsubscribeUser();
        } else {
            subscribeUser();
        }
    });
    // Set the initial subscription value
    swRegistration.pushManager.getSubscription()
        .then(function (subscription) {
            isSubscribed = !(subscription === null);

            updateSubscriptionOnServer(subscription);

            if (isSubscribed) {
                console.log('User IS subscribed.');
            } else {
                console.log('User is NOT subscribed.');
            }

            updateBtn();
        });
}

function updateBtn() {
    if (Notification.permission === 'denied') {
        butSend.textContent = 'Push Messaging Blocked.';
        butSend.disabled = true;
        updateSubscriptionOnServer(null);
        return;
    }

    if (isSubscribed) {
        butSend.textContent = 'Disable Push Messaging!';
    } else {
        butSend.textContent = 'Enable Push Messaging!';
    }

    butSend.disabled = false;
}



function subscribeUser() {
    const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
    swRegistration.pushManager.subscribe({
        //pflichtfeld, immer true
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
    })
        .then(function (subscription) {
            updateSubscriptionOnServer(subscription);

            isSubscribed = true;

            updateBtn();
        })
        .catch(function (err) {
            updateBtn();
        });
}

function updateSubscriptionOnServer(subscription) {
    // TODO: Send subscription to application server

    const subscriptionJson = document.querySelector('.js-subscription-json');
    const subscriptionDetails =
        document.querySelector('.js-subscription-details');

    if (subscription) {
        subscriptionJson.textContent = JSON.stringify(subscription);
        subscriptionDetails.classList.remove('is-invisible');
    } else {
        subscriptionDetails.classList.add('is-invisible');
    }
}

function unsubscribeUser() {
    swRegistration.pushManager.getSubscription()
        .then(function (subscription) {
            if (subscription) {
                return subscription.unsubscribe();
            }
        })
        .catch(function (error) {
            console.log('Error unsubscribing', error);
        })
        .then(function () {
            updateSubscriptionOnServer(null);

            console.log('User is unsubscribed.');
            isSubscribed = false;

            updateBtn();
        });
}