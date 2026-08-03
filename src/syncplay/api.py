from fastapi import FastAPI
from syncplaymanager import SyncplayManager

manager = SyncplayManager()
app = FastAPI()

host="syncplay.pl:8996"
username='Civ'
room='MiBomba test'
url = r'C:\Users\Civ\Downloads\The.Mentalist.S01.1080p.BluRay.x265-KONTRAST\The.Mentalist.S01E07.1080p.BluRay.x265-KONTRAST.mkv'

@app.post('/start')
def startsyncplay():
    success = manager.start(host=host, username=username, room=room)
    if success:
        return {'message': 'program started successfully'}
    else:
        return {'message': 'program failed to start'}
    

@app.post('/stop')
def stopsyncplay():
    success = manager.stop()
    if success:
        return {"message": "the program exited successfully"}
    else:
        return {"message": "error with exiting"}

    
@app.post('/add-video')
def addvideo():
    success = manager.add_video(url=url)
    if success:
        return {'message': 'video started successfully'}
    return {'message': 'video failed to start'}


@app.post('/play')
def playvideo():
    success = manager.pause_play()
    if success:
        return {'message': 'playing successfully'}
    return {'message': 'video failed to start'}