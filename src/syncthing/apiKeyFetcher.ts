export async function apiFetching(){
    const apikey = await window.electron.getApiKey()
    return apikey;
}

