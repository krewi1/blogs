import {Either} from "fp-ts/Either";
import {either} from "fp-ts";
import {absurd, pipe} from "fp-ts/function";

type NetworkError = "NetworkError";
type InternalServerError = "InternalServerError";
interface User {
    id: string;
    name: string;
}
function getUser(): Either<NetworkError, User> {
    return either.left("NetworkError");
}

interface Project {
    id: string;
    mandays: number;
}

function getProjects(userId: string): Either<InternalServerError, Project[]> {
    return either.left("InternalServerError")
}

(async function main() {
    pipe(
        getUser(),
        either.map(user => user.id),
        either.chainW(getProjects),
        either.match(
            (error) => {
                switch (error) {
                    case "InternalServerError":
                        break;
                    case "NetworkError":
                        break;
                    default:
                        absurd(error);
                }
            },
            (data) => {

            }
        )
    )
})();