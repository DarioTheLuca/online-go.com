/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { PaginatedTable } from "PaginatedTable";
import { Player } from "Player";

export function ReportsCenterHistory(): JSX.Element {
    const navigateTo = useNavigate();

    return (
        <div className="ReportsCenterHistory">
            <PaginatedTable
                className="history"
                name="reports-appeals"
                source={"moderation/incident"}
                orderBy={["-updated"]}
                columns={[
                    {
                        header: "Report",
                        className: () => "report",
                        render: (X) => (
                            <button
                                onClick={() => navigateTo(`/reports-center/all/${X?.id}`)}
                                className="small"
                            >
                                {"R" + X?.id?.toString()?.substr(-3)}
                            </button>
                        ),
                    },
                    {
                        header: "Moderator",
                        className: () => "moderator",
                        render: (X) => X.moderator && <Player user={X.moderator} />,
                    },
                    {
                        header: "Reporter",
                        className: () => "state",
                        render: (X) => <Player user={X.reporting_user} />,
                    },
                    {
                        header: "Type",
                        className: () => "report_type",
                        render: (X) => X.report_type,
                    },
                    {
                        header: "Reported",
                        className: () => "reported",
                        render: (X) => (
                            <>
                                {X.reported_user && <Player user={X.reported_user} />}{" "}
                                {X.reported_game && (
                                    <Link to={`/game/${X.reported_game}`}>#{X.reported_game}</Link>
                                )}{" "}
                                {X.reported_review && (
                                    <Link to={`/review/${X.reported_review}`}>
                                        ##{X.reported_review}
                                    </Link>
                                )}
                            </>
                        ),
                    },
                    {
                        header: "State",
                        className: () => "state",
                        render: (X) => X.state,
                    },
                    {
                        header: "Note",
                        className: () => "note",
                        render: (X) =>
                            (X.reporter_note_translation?.target_text || X.reporter_note).substring(
                                0,
                                30,
                            ),
                    },
                ]}
            />
        </div>
    );
}
