type NetworkError = "NetworkError";
interface User {
    id: string;
    name: string;
}
function getUser(): User {
    throw "NetworkError";
}

interface Project {
    id: string;
    mandays: number;
}

function getProjects(userId: string): Project[] {
    throw "InternalServerError";
}

(async function main() {
    try {
        const user = await getUser();
        const projects = await getProjects(user.id);
    } catch (e) {
        // we dont know what error can be and we have to check it
        if (e === "NetworkError") {
            //handle network error
        }
        if (e === "InternalServerError") {
            //handle internal server error
        }
    }
})();