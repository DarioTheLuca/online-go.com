/*
 * Copyright (C) 2012-2022  Online-Go.com
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
import { Link, useLocation } from "react-router-dom";

import * as data from "data";
import * as preferences from "preferences";
import * as DynamicHelp from "DynamicHelp";

import { _ } from "translate";
import { PlayerIcon } from "PlayerIcon";
import { LineText } from "misc-ui";
import { createDemoBoard } from "ChallengeModal";
import { LanguagePicker } from "LanguagePicker";
import { GobanThemePicker } from "GobanThemePicker";
import { IncidentReportTracker } from "IncidentReportTracker";
import { NotificationList, notification_manager } from "Notifications";
import { TurnIndicator } from "TurnIndicator";
import { NotificationIndicator } from "NotificationIndicator";
import { TournamentIndicator } from "Announcements";
import { FriendIndicator } from "FriendList";

import { logout } from "auth";
import { useUser } from "hooks";
import { OmniSearch } from "./OmniSearch";
import { hideHelpSetItem, isVisible, showHelpSetItem } from "dynamic_help_config";

const body = $(document.body);

function _update_theme(theme: string) {
    if (body.hasClass(theme)) {
        return;
    }
    body.removeClass("light dark accessible");
    body.addClass(theme);
}

function setTheme(theme: string) {
    data.set("theme", theme, data.Replication.REMOTE_OVERWRITES_LOCAL); // causes _update_theme to be called via the data.watch() in constructor
}

function toggleTheme() {
    if (data.get("theme") === "dark") {
        setTheme("light");
    } else if (data.get("theme") === "light") {
        setTheme("accessible");
    } else {
        setTheme("dark");
    }
}
const setThemeLight = setTheme.bind(null, "light");
const setThemeDark = setTheme.bind(null, "dark");
const setThemeAccessible = setTheme.bind(null, "accessible");

export function EXV6NavBar(): JSX.Element {
    const user = useUser();
    const location = useLocation();
    const [search, setSearch] = React.useState<string>("");
    const [right_nav_active, setRightNavActive] = React.useState(false);
    const [notifications_active, setNotificationsActive] = React.useState(false);
    const [hamburger_expanded, setHamburgerExpanded] = React.useState(false);

    const closeNavbar = () => {
        setRightNavActive(false);
        setNotificationsActive(false);
    };

    const toggleNotifications = () => {
        if (notifications_active === false) {
            notification_manager.event_emitter.emit("notification-count", 0);
        }
        setNotificationsActive(!notifications_active);
    };

    const toggleRightNav = () => {
        if (!right_nav_active) {
            if (isVisible("guest-arrival-help-set", "right-nav-help")) {
                hideHelpSetItem("guest-arrival-help-set", "right-nav-help");
            }
            if (isVisible("guest-arrival-help-set", "username-change-help")) {
                hideHelpSetItem("guest-arrival-help-set", "username-change-help");
                showHelpSetItem("guest-arrival-help-set", "profile-button-username-help");
            }
        }
        setRightNavActive(!right_nav_active);
    };

    const toggleHamburgerExpanded = () => {
        setHamburgerExpanded(!hamburger_expanded);
    };

    const newDemo = () => {
        closeNavbar();
        createDemoBoard();
    };

    React.useEffect(() => {
        setHamburgerExpanded(false);
        closeNavbar();
    }, [location.pathname]);

    React.useEffect(() => {
        // here we are watching in case 'theme' is updated by the
        // remote-storage update mechanism, which doesn't call setTheme()
        data.watch("theme", _update_theme);
    }, []);

    //const valid_user = user.anonymous ? null : user;

    const groups = data.get("cached.groups", []);
    const tournaments = data.get("cached.active_tournaments", []);
    const ladders = data.get("cached.ladders", []);

    // Don't show the signin link at the top if they arrived to the welcome page
    // because the welcome page has special treatment of signin that takes them
    // to the challenge that they accepted via a challenge link.

    const show_signin =
        !window.location.pathname.includes("/welcome") && // a challenge link page is being shown
        !window.location.hash.includes("/welcome"); // the signin with redirect to challenge accept

    return (
        <header className={"NavBar" + (hamburger_expanded ? " hamburger-expanded" : "")}>
            <span className="hamburger" onClick={toggleHamburgerExpanded}>
                {hamburger_expanded ? <i className="fa fa-times" /> : <i className="fa fa-bars" />}
            </span>

            <nav className="left">
                <Link to="/" className="menutitle">
                    {_("Home")}
                </Link>
                <Menu title={_("Play")} to="/play">
                    <Link to="/play">
                        <i className="ogs-goban"></i> {_("Play")}
                    </Link>
                    <div className="submenu-container">
                        <Link to="/tournaments">
                            <i className="fa fa-trophy"></i>
                            {_("Tournaments")}
                        </Link>
                        {tournaments.length > 0 && (
                            <div className="submenu">
                                {tournaments.map((tournament) => (
                                    <Link to={`/tournaments/${tournament.id}`} key={tournament.id}>
                                        <img src={tournament.icon} />
                                        {tournament.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="submenu-container">
                        <Link to="/ladders">
                            <i className="fa fa-list-ol"></i>
                            {_("Ladders")}
                        </Link>
                        {ladders.length > 0 && (
                            <div className="submenu">
                                {ladders.map((ladder) => (
                                    <Link to={`/ladder/${ladder.id}`} key={ladder.id}>
                                        <span className="ladder-rank">#{ladder.player_rank}</span>{" "}
                                        {ladder.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </Menu>
                <Menu title={_("Learn")} to="/learn-to-play-go">
                    <Link to="/learn-to-play-go">
                        <i className="fa fa-graduation-cap"></i>
                        {_("Learn to play Go")}
                    </Link>
                    <Link to="/supporter">
                        <i className="fa fa-star"></i>
                        {_("Sign up for AI game reviews")}
                    </Link>
                    <Link to="/puzzles">
                        <i className="fa fa-puzzle-piece"></i>
                        {_("Puzzles")}
                    </Link>
                    <Link to="/docs/other-go-resources">
                        <i className="fa fa-link"></i>
                        {_("Other Go Resources")}
                    </Link>
                </Menu>
                <Menu title={_("Watch")} to="/observe-games">
                    <Link to="/observe-games">
                        <i className="fa fa-eye"></i>
                        {_("Games")}
                    </Link>
                </Menu>

                <Menu title={_("Community")} to="/chat">
                    <Link to="/chat">
                        <i className="fa fa-comment-o"></i>
                        {_("Chat")}
                    </Link>
                    <div className="submenu-container">
                        <Link to="/groups">
                            <i className="fa fa-users"></i>
                            {_("Groups")}
                        </Link>
                        {groups.length > 0 && (
                            <div className="submenu">
                                {groups.map((group) => (
                                    <Link to={`/group/${group.id}`} key={group.id}>
                                        <img src={group.icon} />
                                        {group.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    <a href="https://forums.online-go.com/" target="_blank">
                        <i className="fa fa-comments"></i>
                        {_("Forums")}
                    </a>
                    <Link to="/supporter">
                        <i className="fa fa-star"></i>
                        {_("Support OGS")}
                    </Link>
                    <Link to="/docs/about">
                        <i className="fa fa-info-circle"></i>
                        {_("About")}
                    </Link>
                    <a href="https://github.com/online-go/online-go.com/" target="_blank">
                        <i className="fa fa-github"></i>
                        {_("GitHub")}
                    </a>
                    <a href="https://github.com/online-go/online-go.com/wiki">
                        <i className="fa fa-question-circle"></i>
                        {_("Documentation & FAQ")}
                    </a>
                </Menu>

                <Menu title={_("Tools")}>
                    <section className="OmniSearch-container">
                        <i className="fa fa-search" />
                        <input
                            type="search"
                            className="OmniSearch-input"
                            value={search}
                            onChange={(ev) => setSearch(ev.target.value)}
                            onKeyUp={(ev) => {
                                if (ev.key === "Escape") {
                                    setSearch("");
                                }
                            }}
                            placeholder={_("Search")}
                        />
                        <OmniSearch search={search} />
                    </section>

                    <Link to="/joseki">
                        <i className="fa fa-sitemap"></i>
                        {_("Joseki")}
                    </Link>
                    <span className="fakelink" onClick={newDemo}>
                        <i className="fa fa-plus"></i>
                        {_("Demo Board")}
                    </span>
                    <Link to={`/library/${user.id}`}>
                        <i className="fa fa-book"></i>
                        {_("SGF Library")}
                    </Link>

                    {user.is_moderator && (
                        <Link className="admin-link" to="/moderator">
                            <i className="fa fa-gavel"></i>
                            {_("Moderator Center")}
                        </Link>
                    )}
                    {user.is_moderator && (
                        <Link className="admin-link" to="/appeals-center">
                            <i className="fa fa-gavel"></i>
                            {_("Appeals Center")}
                        </Link>
                    )}
                    {user.is_moderator && (
                        <Link className="admin-link" to="/admin/firewall">
                            <i className="fa fa-fire-extinguisher"></i>
                            Firewall
                        </Link>
                    )}
                    {(user.is_moderator || user.is_announcer) && (
                        <Link className="admin-link" to="/announcement-center">
                            <i className="fa fa-bullhorn"></i>
                            {_("Announcement Center")}
                        </Link>
                    )}
                    {user.is_superuser && (
                        <Link className="admin-link" to="/admin">
                            <i className="fa fa-wrench"></i> Admin
                        </Link>
                    )}
                </Menu>
            </nav>

            {user.anonymous ? (
                <section className="right">
                    <i className="fa fa-adjust" onClick={toggleTheme} />
                    <LanguagePicker />
                    {(show_signin || null) && (
                        <Link className="sign-in" to={"/sign-in#" + location.pathname}>
                            {_("Sign In")}
                        </Link>
                    )}
                </section>
            ) : (
                <section className="right">
                    {!preferences.get("hide-incident-reports") && <IncidentReportTracker />}
                    {preferences.get("show-tournament-indicator") && <TournamentIndicator />}
                    <TurnIndicator />
                    <FriendIndicator />
                    <NotificationIndicator onClick={toggleNotifications} />
                    <span className="icon-container" onClick={toggleRightNav}>
                        <DynamicHelp.RightNavHelp />
                        <DynamicHelp.UsernameChangeHelp />
                        {user.username}
                    </span>
                </section>
            )}

            <div
                className={
                    "nav-menu-modal-backdrop " +
                    (notifications_active || right_nav_active ? "active" : "")
                }
                onClick={closeNavbar}
            />

            {notifications_active && <NotificationList />}

            {/* Right Nav */}
            {right_nav_active && (
                <div className="RightNav">
                    <Link to={`/user/view/${user.id}`}>
                        <DynamicHelp.ProfileButtonUsernameHelp />
                        <PlayerIcon user={user} size={16} />
                        {_("Profile")}
                    </Link>

                    <Link to="/user/settings">
                        <DynamicHelp.SettingsButtonHelp />
                        <i className="fa fa-gear"></i>
                        {_("Settings")}
                    </Link>
                    <span className="fakelink" onClick={logout}>
                        <i className="fa fa-power-off"></i>
                        {_("Sign out")}
                    </span>

                    <LineText>{_("Theme")}</LineText>

                    <div className="theme-selectors">
                        <button className="theme-button light" onClick={setThemeLight}>
                            <i className="fa fa-sun-o" />
                        </button>
                        <button className="theme-button dark" onClick={setThemeDark}>
                            <i className="fa fa-moon-o" />
                        </button>
                        <button className="theme-button accessible" onClick={setThemeAccessible}>
                            <i className="fa fa-eye" />
                        </button>
                    </div>

                    <div className="theme-selectors">
                        <GobanThemePicker />
                    </div>
                </div>
            )}
        </header>
    );
}

interface MenuProps {
    title: string;
    to?: string;
    children: React.ReactNode;
}

function Menu({ title, to, children }: MenuProps): JSX.Element {
    return (
        <section className="menu">
            {to ? (
                <Link to={to} className="menutitle">
                    {title}
                </Link>
            ) : (
                <span className="menutitle">{title}</span>
            )}
            <div className="menu-children">{children}</div>
        </section>
    );
}
