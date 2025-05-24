export function getRoomId(){
    const currentUrl = window.location.href ;
    const last = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
    return last;
}
export function getUserId(){
    return localStorage.getItem('userId');
}
export function joinRoom(roomId, userId){
    Socket.emit('join-room', {roomId, userId});
}
