from pprint import pprint

from ongil_mvp.domain import UserInput
from ongil_mvp.engine import recommend_course
from ongil_mvp.sample_data import SUNCHEON_SPOTS


def main() -> None:
    user = UserInput(
        start_lat=34.9506,
        start_lng=127.4872,
        age_group="20s",
        gender="female",
        companion_type="friends",
        companion_count=3,
        transport="public",
        place_count=3,
    )

    course = recommend_course(user, SUNCHEON_SPOTS)
    pprint(course)


if __name__ == "__main__":
    main()
